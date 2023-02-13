/* eslint-disable quote-props */
/**
 * TODO:
 *  - handle separated students
 */
require('dotenv').config();
const { loadGoogleSpreadsheet, replaceWorksheet, getRows } = require('../googleSheets');
const {
  DOC_ID_CESP,
  DOC_ID_PULSE,
  SHEET_ID_CESP_ROSTER,
  SHEET_ID_CESP_MODULE_COMPLETION,
} = require('../config/cohorts');
const techMentors = require('../config/techMentors');

const CESP_ROSTER_SHEET_HEADERS = [
  'Full Name',
  'Campus',
  'GitHub',
  'Deadline Group',
  'Date Added',
  'SFDC Email',
  'VBA Funding Type',
  'Prep Type',
  'PRP Laser Coaching',
  'Precourse Attempts',
  'Tech Mentor',
  'Precourse Complete',
  'Status',
];
const CESP_MODULE_COMPLETION_SHEET_HEADERS = [
  'Full Name',
  'Campus',
  'GitHub',
  'Deadline Group',
  'Date Added',
  'Tech Mentor',
  'Module 1',
  'Module 2',
  'Module 3',
  'All Complete',
];

const sortStudentsByFullName = (a, b) =>
  a.fullName.toLowerCase().localeCompare(b.fullName.toLowerCase());
const sortStudentsByCampus = (a, b) =>
  a.campus.toLowerCase().localeCompare(b.campus.toLowerCase());
const sortStudentsByDateAdded = (a, b) =>
  a.dateAddedToPrecourse.toLowerCase().localeCompare(b.dateAddedToPrecourse.toLowerCase());

const formatStudentsForCESPRosterSheet = (students, separations) => students.map((student) => ({
  'Full Name': student.fullName,
  'Campus': student.campus,
  'GitHub': student.githubHandle,
  'Deadline Group': student.deadlineGroup,
  'Date Added': student.dateAddedToPrecourse,
  'SFDC Email': student.email,
  'VBA Funding Type': student.VBAFundingType,
  'Prep Type': student.prepType,
  'PRP Laser Coaching': student.hadLaserCoaching,
  'Precourse Attempts': student.numPrecourseEnrollments,
  'Tech Mentor': student.techMentor,
  'Precourse Complete': student.allComplete,
  'Status': (separations.find((separatedStudent) => separatedStudent.fullName === student.fullName) || { separationType: 'Enrolled' }).separationType,
}));
const formatStudentsForCESPModuleCompletionSheet = (students) => students.map((student) => ({
  'Full Name': student.fullName,
  'Campus': student.campus,
  'GitHub': student.githubHandle,
  'Deadline Group': student.deadlineGroup,
  'Date Added': student.dateAddedToPrecourse,
  'Tech Mentor': student.techMentor,
  'Module 1': student.partOneComplete,
  'Module 2': student.partTwoComplete,
  'Module 3': student.partThreeComplete,
  'All Complete': student.allComplete,
}));

const filterAndSortStudents = (students) => students
  .filter((student) => student.fullName)
  .sort(sortStudentsByFullName)
  .sort(sortStudentsByDateAdded)
  .sort(sortStudentsByCampus);

(async () => {
  console.info('Retrieving roster from Pulse...');
  const pulseSheet = await loadGoogleSpreadsheet(DOC_ID_PULSE);
  const studentsFromRepoCompletion = await Promise.all(
    techMentors.map((techMentor) => getRows(
      pulseSheet.sheetsById[techMentor.repoCompletionSheetID],
    )),
  );
  const studentsFromSeparatedRepoCompletion = await getRows(pulseSheet.sheetsByTitle['Separated Repo Completion']);
  const students = filterAndSortStudents(studentsFromRepoCompletion.flat())
    .concat(filterAndSortStudents(studentsFromSeparatedRepoCompletion));
  const separations = await getRows(pulseSheet.sheetsByTitle['Separation Tracker']);
  const repoCompletionStudentsNotSeparated = students.filter((student) => !separations.find(
    (separatedStudent) => separatedStudent.fullName === student.fullName,
  ));
  const roster = formatStudentsForCESPRosterSheet(students, separations);
  const moduleCompletion = formatStudentsForCESPModuleCompletionSheet(repoCompletionStudentsNotSeparated);

  console.info(`Adding ${students.length} students to CES&P roster.`);

  console.info('Retrieving CES&P sheet...');
  const doc = await loadGoogleSpreadsheet(DOC_ID_CESP);

  console.info('Updating roster worksheet...');
  await replaceWorksheet(doc.sheetsById[SHEET_ID_CESP_ROSTER], CESP_ROSTER_SHEET_HEADERS, roster);

  console.info('Updating module completion worksheet...');
  await replaceWorksheet(
    doc.sheetsById[SHEET_ID_CESP_MODULE_COMPLETION],
    CESP_MODULE_COMPLETION_SHEET_HEADERS,
    moduleCompletion,
  );

  console.info('Done!');
})();
