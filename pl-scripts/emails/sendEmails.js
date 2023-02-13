require('dotenv').config();
const Bottleneck = require('bottleneck');
const { DOC_ID_PULSE } = require('../../config/cohorts');
const { loadGoogleSpreadsheet } = require('../../googleSheets');

const { sendEmailFromDraft } = require('../../googleMail');

const EMAIL_SENDER_NAME = 'SEI Precourse';
const EMAIL_SENDER_ADDRESS = 'sei.precourse@galvanize.com';

const rateLimiter = new Bottleneck({
  maxConcurrent: 2,
  minTime: 600,
});
const sendEmailFromDraftRL = rateLimiter.wrap(sendEmailFromDraft);

async function sendEmails(
  emailDefinitions,
  printRecipientsWithoutSending = true,
  testEmailAddress = undefined,
) {
  const docPulse = await loadGoogleSpreadsheet(DOC_ID_PULSE);
  const cacheWorksheet = docPulse.sheetsByTitle['PAOLA Email Cache'];
  const cacheWorksheetRows = await cacheWorksheet.getRows();
  const emailsCache = cacheWorksheetRows.reduce(
    (acc, row) => ({
      ...acc,
      [row.emailKey]: {
        addresses: row.addresses.split(','),
        row,
      },
    }),
    {},
  );

  for (const { key, draftName, getEmails } of emailDefinitions) {
    console.info(`Checking for ${draftName}...`);

    const sentEmails = emailsCache[key] ? emailsCache[key].addresses : [];

    const allRecipients = await getEmails();
    const filteredRecipients = allRecipients.filter(({ student }) => !sentEmails.includes(student.email));
    filteredRecipients.forEach(({ student }) => console.info('> ', student.email));
    let recipients = filteredRecipients;
    if (testEmailAddress) {
      if (filteredRecipients.length === 0) {
        recipients = [{
          student: { email: testEmailAddress },
          fields: {
            name: 'Tchicphillait',
            deadlineDate: '13/37',
            formURL: 'formURL',
            slackJoinURL: 'slackJoinURL',
            learnCohortId1: 'learnCohortId1',
            learnCohortId2: 'learnCohortId2',
            details: 'foo bar baz',
          },
        }];
      } else {
        recipients = [filteredRecipients[0]];
        recipients[0].student.email = testEmailAddress;
      }
    }

    await Promise.all(
      recipients.map(({ student, fields }) => {
        console.info(`Sending "${draftName}" to ${student.fullName} <${student.email}> (${student.techMentor}'s Pod)`);
        if (!printRecipientsWithoutSending) {
          return sendEmailFromDraftRL(
            draftName,
            testEmailAddress || student.email,
            [EMAIL_SENDER_ADDRESS],
            [],
            { name: EMAIL_SENDER_NAME, email: EMAIL_SENDER_ADDRESS },
            fields,
          );
        }
        return null;
      }),
    );

    // only update cache if using real data
    if (!printRecipientsWithoutSending && !testEmailAddress && recipients.length > 0) {
      console.info('Updating list of sent emails...');
      const cacheValue = allRecipients.map(({ student }) => student.email).join(',');
      if (emailsCache[key]) {
        emailsCache[key].row.addresses = cacheValue;
        await emailsCache[key].row.save();
      } else {
        await cacheWorksheet.addRow({
          emailKey: key,
          addresses: cacheValue,
        });
      }
    }
  }
}

module.exports = sendEmails;
