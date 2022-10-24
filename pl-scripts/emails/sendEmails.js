/* eslint-disable no-restricted-syntax, no-await-in-loop, no-console */
require('dotenv').config();
import Bottleneck from 'bottleneck';
import { DOC_ID_PULSE } from '../../constants';
import {
  loadGoogleSpreadsheet,
  getSheetMetadata,
  upsertSheetMetadata,
  // deleteSheetMetadata,
} from '../../googleSheets';
import { sendEmailFromDraft } from '../../googleMail';

const EMAIL_SENDER_NAME = 'SEI Precourse';
const EMAIL_SENDER_ADDRESS = 'sei.precourse@galvanize.com';

const rateLimiter = new Bottleneck({
  maxConcurrent: 2,
  minTime: 600,
});
const sendEmailFromDraftRL = rateLimiter.wrap(sendEmailFromDraft);

export default async function sendEmails(
  emailDefinitions,
  printRecipientsWithoutSending = true,
  testEmailAddress,
) {
  const docPulse = await loadGoogleSpreadsheet(DOC_ID_PULSE);
  for (const { key, draftName, getEmails } of emailDefinitions) {
    console.info(`Checking for ${draftName}...`);
    // if (CLEAR_CACHE) {
    //   console.info('Clearing list of sent emails...');
    //   await deleteSheetMetadata(docPulse, key);
    // }

    const sheetMetadata = (await getSheetMetadata(docPulse, key)) || '';
    const sentEmails = sheetMetadata.split(',');
    const allRecipients = await getEmails();
    const filteredRecipients = allRecipients.filter(({ student }) => !sentEmails.includes(student.email));
    filteredRecipients.forEach(({ student }) => console.info('> ', student.email));
    let recipients = filteredRecipients;
    if (testEmailAddress) {
      if (filteredRecipients.length === 0) {
        recipients = [{
          student: {email: testEmailAddress},
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
      await upsertSheetMetadata(docPulse, key, allRecipients.map(({ student }) => student.email).join(','));
    }
  }
}
