const {
  TEST_COUNT_KOANS,
  TEST_COUNT_TESTBUILDER_MIN,
  TEST_COUNT_TESTBUILDER_MAX,
  TEST_COUNT_UNDERBAR_PART_ONE,
  TEST_COUNT_UNDERBAR_PART_TWO,
  TEST_COUNT_TWIDDLER,
  TEST_COUNT_RECURSION,
  SHEET_ID_DEFERRAL_FORM,
} = require('../config/cohorts');

const val = (name) => `INDIRECT("R[0]C" & MATCH("${name}",$A$1:$1,0), false)`;

const formatStudentForRepoCompletion = (student, techMentor, currentDeadlineGroup) => ({
  fullName: student.fullName,
  preferredFirstName: student.preferredFirstName,
  pronouns: student.pronouns,
  campus: student.campus,
  githubHandle: student.githubHandle,
  deadlineGroup: currentDeadlineGroup,
  dateAddedToPrecourse: student.dateAddedToPrecourse,
  email: student.email,
  techMentor,
  prepType: student.selfReportedPrepartion,
  // NB: for this column to work on each new cohort,
  // // the iferror in the formula has to be unwrapped to allow access
  hadLaserCoaching: `=IF(EQ(IFERROR(vlookup(${val('fullName')},` +
                    'IMPORTRANGE("https://docs.google.com/spreadsheets/d/1v3ve2aYtO6MsG6Zjp-SBX-ote6JdWVvuYekHUst2wWw","Laser Coached Students Enrolled!A2:A"),1,false),' +
                    `"No"), ${val('fullName')}), "Yes", "No")`,
  numPrecourseEnrollments: `=MAX(COUNTIF('Precourse Enrollments Archive'!$B:$B,${val('fullName')}),` +
                          `COUNTIF('Precourse Enrollments Archive'!$D:$D,${val('githubHandle')}),` +
                          `COUNTIF('Precourse Enrollments Archive'!$G:$G,${val('email')})) + 1`,
  koansMinReqs: 'No Fork',
  javascriptKoans: 'No Fork',
  testbuilder: 'No Fork',
  underbarPartOne: 'No Fork',
  underbarPartTwo: 'No Fork',
  twiddler: 'No Fork',
  recursion: 'No Fork',
  partOneComplete: `=IF(AND(${val('koansMinReqs')}="Yes", ${val('javascriptKoans')}>=${TEST_COUNT_KOANS},` +
                  `${val('testbuilder')}>=${TEST_COUNT_TESTBUILDER_MIN}, ${val('testbuilder')}<=${TEST_COUNT_TESTBUILDER_MAX},` +
                  `${val('underbarPartOne')}=${TEST_COUNT_UNDERBAR_PART_ONE}), "Yes", "No")`,
  partTwoComplete: `=IF(AND(${val('underbarPartTwo')}=${TEST_COUNT_UNDERBAR_PART_TWO}, ${val('twiddler')}>=${TEST_COUNT_TWIDDLER}, ISNUMBER(${val('twiddler')})), "Yes", "No")`,
  partThreeComplete: `=IF(AND(${val('recursion')}>=${TEST_COUNT_RECURSION}, ISNUMBER(${val('recursion')})),"Yes", "No")`,
  allComplete: `=IF(AND(${val('partOneComplete')}="Yes",${val('partTwoComplete')}="Yes",${val('partThreeComplete')}="Yes"),"Yes","No")`,
  completedDIF:
    `=IF(${val('numPrecourseEnrollments')} = 1, "N/A", IF(IFNA(MATCH(${val('fullName')}, 'Deferral Intake Form'!$B:$B, 0), "Not found") <> "Not found",` +
    `HYPERLINK(
      CONCAT("#gid=${SHEET_ID_DEFERRAL_FORM}&range=", MATCH(${val('fullName')}, 'Deferral Intake Form'!$B:$B, 0) & ":" & MATCH(${val('fullName')},
      'Deferral Intake Form'!$B:$B, 0)),` +
    '"See responses"), "Not found"))',
  m1DiagnosticTask1: `=IFNA(VLOOKUP(${val('email')}, 'CodeSignal Results Module 1'!$A:$Z, 9, false), "-")`,
  m1DiagnosticTask2: `=IFNA(VLOOKUP(${val('email')}, 'CodeSignal Results Module 1'!$A:$Z,11, false), "-")`,
  m2DiagnosticTask1: `=IFNA(VLOOKUP(${val('email')}, 'CodeSignal Results Module 2'!$A:$Z, 9, false), "-")`,
  m2DiagnosticTask2: `=IFNA(VLOOKUP(${val('email')}, 'CodeSignal Results Module 2'!$A:$Z,11, false), "-")`,
  m3DiagnosticTask1: `=IFNA(VLOOKUP(${val('email')}, 'CodeSignal Results Module 3'!$A:$Z, 9, false), "-")`,
  m3DiagnosticTask2: `=IFNA(VLOOKUP(${val('email')}, 'CodeSignal Results Module 3'!$A:$Z,11, false), "-")`,
});

module.exports = formatStudentForRepoCompletion;
