/* eslint-disable no-console, quote-props */
/**
 * TODO:
 *  - handle separated students
 *  - remove or update the "CES&P is updated" box with date on the sheet
 */
require('dotenv').config();
import { loadGoogleSpreadsheet, replaceWorksheet, getRows } from '../googleSheets';
import {
  DOC_ID_CESP,
  DOC_ID_PULSE,
  SHEET_ID_CESP_ROSTER,
  SHEET_ID_CESP_MODULE_COMPLETION,
} from '../constants';
import techMentors from '../tech-mentors';

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
  'RFP Pod',
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
  a.dateAdded.toLowerCase().localeCompare(b.dateAdded.toLowerCase());

const formatStudentsForCESPRosterSheet = (students, separations) => students.map((student) => ({
  'Full Name': student.fullName,
  'Campus': student.campus,
  'GitHub': student.githubHandle,
  'Deadline Group': student.deadlineGroup,
  'Date Added': student.dateAdded,
  'SFDC Email': student.email,
  'VBA Funding Type': student.VBAFundingType,
  'Prep Type': student.prepType,
  'PRP Laser Coaching': student.hadLaserCoaching,
  'Precourse Attempts': student.numPrecourseEnrollments,
  'Tech Mentor': student.techMentor,
  'Precourse Complete': student.allComplete,
  'Status': (separations.find((separatedStudent) => separatedStudent.fullName === student.fullName) || { separationType: 'Enrolled' }).separationType,
  'RFP Pod': student['RFP Pod'],
}));
const formatStudentsForCESPModuleCompletionSheet = (students) => students.map((student) => ({
  'Full Name': student.fullName,
  'Campus': student.campus,
  'GitHub': student.githubHandle,
  'Deadline Group': student.deadlineGroup,
  'Date Added': student.dateAdded,
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

// Pods are assigned to RFP students by:
// - creating two equally sized pods
// - one pod contains all non-California residents
// - attempts to keep average diagnostic scores equal
// This function mutates the student objects passed in! ⚠
const assignPods = async (repoCompletionStudents, rosterStudents) => {
  const pacificStudents = repoCompletionStudents.filter((s) => s.campus === 'RFT Pacific')
    .map((s) => {
      const scores = [
        s.m1DiagnosticTask1,
        s.m1DiagnosticTask2,
        s.m2DiagnosticTask1,
        s.m2DiagnosticTask2,
        s.m3DiagnosticTask1,
        s.m3DiagnosticTask2,
      ].filter((score) => score !== '-' && score !== undefined);
      const hasDiagnostics = scores.length > 0;
      const diagnosticAverage = scores.length > 0
        ? scores.reduce((acc, cur) => acc + Number(cur), 0) / scores.length
        : 0;

      const rosterMatch = rosterStudents.find((rosterEntry) => rosterEntry.fullName.toLowerCase()
        === s.fullName.toLowerCase());
      const isCalifornia = !!(rosterMatch && (
        rosterMatch.addressWhileInSchool.match(/california/i)
        || rosterMatch.addressWhileInSchool.match(/\bCA\b/)
      ));

      return {
        ...s,
        isCalifornia,
        hasDiagnostics,
        diagnosticAverage,
      };
    });

  const getPodAverage = (pod) => {
    const a = pod.filter((s) => s.hasDiagnostics && s.diagnosticAverage);
    return a.reduce((acc, cur) => acc + cur.diagnosticAverage, 0) / a.length;
  };

  const nonCaliPod = pacificStudents.filter((s) => !s.isCalifornia);
  const caliPod = pacificStudents.filter((s) => s.isCalifornia);
  let largerPodName = 'Only CA';
  let smallerPodName = 'Includes Outside CA';
  let largerPod = caliPod;
  let smallerPod = nonCaliPod;
  if (nonCaliPod.length > caliPod.length) {
    largerPodName = 'Includes Outside CA';
    smallerPodName = 'Only CA';
    largerPod = nonCaliPod;
    smallerPod = caliPod;
  }
  while (largerPod.length > smallerPod.length) {
    let hasStudentsToMove = false;
    const largerPodAverage = getPodAverage(largerPod);
    const smallerPodAverage = getPodAverage(smallerPod);
    for (let i = 0; i < largerPod.length; i++) {
      if (largerPod[i].hasDiagnostics) {
        if (
          (largerPodAverage > smallerPodAverage && largerPod[i].diagnosticAverage > smallerPodAverage) ||
          (largerPodAverage < smallerPodAverage && largerPod[i].diagnosticAverage < largerPodAverage)
        ) {
          const student = largerPod.splice(i, 1)[0];
          smallerPod.push(student);
          hasStudentsToMove = true;
          break;
        }
      }
    }
    if (!hasStudentsToMove) {
      break;
    }
  }
  console.log(
    'Created two pods with an average diagnostic score difference of',
    Math.abs(getPodAverage(caliPod) - getPodAverage(nonCaliPod)),
  );
  repoCompletionStudents.forEach((student) => {
    if (largerPod.find((ts) => ts.githubHandle.toLowerCase() === student.githubHandle.toLowerCase())) {
      student['RFP Pod'] = largerPodName;
    } else if (smallerPod.find((ts) => ts.githubHandle.toLowerCase() === student.githubHandle.toLowerCase())) {
      student['RFP Pod'] = smallerPodName;
    } else {
      student['RFP Pod'] = '';
    }
  });
};

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
  const rosterStudents = await getRows(pulseSheet.sheetsByTitle['HRPTIV']);
  assignPods(repoCompletionStudentsNotSeparated, rosterStudents);
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
