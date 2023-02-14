require('dotenv').config();

const { getAllStudents, formatSFDCStudentForRoster } = require('../salesforce');
const { loadGoogleSpreadsheet } = require('../googleSheets');
const {
  DOC_ID_HRPTIV,
  DOC_ID_PULSE,
  SHEET_ID_HRPTIV_ROSTER,
} = require('../config/cohorts');
const techMentors = require('../config/techMentors');
const formatStudentForRepoCompletion = require('./formatStudentForRepoCompletion');

const normalizeField = (str) => String(str).replace(/\r/g, '');

(async () => {
  console.log('Getting roster...');
  const sheetHRPTIV = await loadGoogleSpreadsheet(DOC_ID_HRPTIV);
  const rosterStudents = await sheetHRPTIV.sheetsById[SHEET_ID_HRPTIV_ROSTER].getRows();
  console.log(rosterStudents.length, 'roster students found');

  console.log('Getting students from SFDC...');
  const sfdcStudents = await getAllStudents();
  console.log(sfdcStudents.length, 'SFDC students found');

  const ignoredKeys = ['deadlineGroup\n(Keep Blank)', 'dateAddedToPrecourse'];
  const repoCompletionFieldWhitelist = ['fullName', 'preferredFirstName', 'campus', 'githubHandle', 'email', 'prepType'];

  for (const rosterStudent of rosterStudents) {
    const sfdcStudent = sfdcStudents.find((s) => s.sfdcOpportunityId === rosterStudent.sfdcOpportunityId);
    if (!sfdcStudent) {
      // Student opp not found, which means they've separated
      continue;
    }
    const formattedSFDCStudent = formatSFDCStudentForRoster(sfdcStudent);
    let hasChanges = false;
    rosterStudent._sheet.headerValues.forEach((key) => { // eslint-disable-line no-underscore-dangle
      if (
        !ignoredKeys.includes(key) &&
        !(formattedSFDCStudent[key] === null && !rosterStudent[key]) &&
        (
          (formattedSFDCStudent[key] instanceof Date && formattedSFDCStudent[key].toISOString() !== rosterStudent[key]) ||
          (!(formattedSFDCStudent[key] instanceof Date) && normalizeField(formattedSFDCStudent[key]) !== normalizeField(rosterStudent[key]))
        )
      ) {
        console.log('Update', formattedSFDCStudent.fullName, 'field', key, 'from', normalizeField(rosterStudent[key]), 'to', normalizeField(formattedSFDCStudent[key]));
        rosterStudent[key] = normalizeField(formattedSFDCStudent[key]);
        hasChanges = true;
      }
    });
    if (hasChanges) await rosterStudent.save();
  }

  console.log('Getting students from Pulse...');
  const sheetPulse = await loadGoogleSpreadsheet(DOC_ID_PULSE);
  for (const { repoCompletionSheetID, name: techMentorName } of techMentors) {
    const repoCompletionStudents = await sheetPulse.sheetsById[repoCompletionSheetID].getRows();
    console.log(`For techMentor ${techMentorName}, ${repoCompletionStudents.length} students found`);

    for (const repoCompletionStudent of repoCompletionStudents) { // eslint-disable-line
      const sfdcStudent = sfdcStudents.find((s) => s.github === repoCompletionStudent.githubHandle);
      if (!sfdcStudent) {
        // Student opp not found, which means they've separated
        console.log('No match for student:', repoCompletionStudent.fullName, ' - has this student separated?');
        continue;
      }
      const formattedSFDCStudent = formatStudentForRepoCompletion(formatSFDCStudentForRoster(sfdcStudent), techMentorName);
      let hasChanges = false;
      repoCompletionFieldWhitelist.forEach((key) => {
        if (
          !(formattedSFDCStudent[key] === null && !repoCompletionStudent[key]) &&
          (
            (formattedSFDCStudent[key] instanceof Date && formattedSFDCStudent[key].toISOString() !== repoCompletionStudent[key]) ||
            (!(formattedSFDCStudent[key] instanceof Date) && normalizeField(formattedSFDCStudent[key]) !== normalizeField(repoCompletionStudent[key]))
          )
        ) {
          console.log('Update', formattedSFDCStudent.fullName, 'field', key, 'from', normalizeField(repoCompletionStudent[key]), 'to', normalizeField(formattedSFDCStudent[key]));
          repoCompletionStudent[key] = normalizeField(formattedSFDCStudent[key]);
          hasChanges = true;
        }
      });
      if (hasChanges) await repoCompletionStudent.save();
    }
  }
})();
