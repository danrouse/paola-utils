const {
  TEST_COUNT_KOANS,
  TEST_COUNT_TESTBUILDER_MIN,
  TEST_COUNT_TESTBUILDER_MAX,
  TEST_COUNT_UNDERBAR_PART_ONE,
  TEST_COUNT_UNDERBAR_PART_TWO,
  TEST_COUNT_TWIDDLER,
  TEST_COUNT_RECURSION,
} = require('../constants');

const formatStudentForRepoCompletion = (student, techMentor, rowIndex, currentDeadlineGroup) => ({
  fullName: student.fullName,
  preferredFirstName: student.preferredFirstName,
  pronouns: student.pronouns,
  campus: student.campus,
  githubHandle: student.githubHandle,
  deadlineGroup: currentDeadlineGroup,
  dateAdded: student.dateAddedToPrecourse,
  email: student.email,
  techMentor,
  // VBAFundingType: student.VBAFundingType,
  prepType: student.selfReportedPrepartion,
  // NB: for this column to work on each new cohort,
  // the iferror in the formula has to be unwrapped to allow access
  hadLaserCoaching: `=IF(EQ(IFERROR(vlookup(A${rowIndex},` +
                    'IMPORTRANGE("https://docs.google.com/spreadsheets/d/1v3ve2aYtO6MsG6Zjp-SBX-ote6JdWVvuYekHUst2wWw","Laser Coached Students Enrolled!A2:A"),1,false),' +
                    `"No"), A${rowIndex}), "Yes", "No")`,
  numPrecourseEnrollments: `=MAX(COUNTIF('Precourse Enrollments Archive'!B:B,A${rowIndex}),` +
                           `COUNTIF('Precourse Enrollments Archive'!D:D,D${rowIndex}),` +
                           `COUNTIF('Precourse Enrollments Archive'!G:G,G${rowIndex})) + 1`,
  koansMinReqs: 'No Fork',
  javascriptKoans: 'No Fork',
  testbuilder: 'No Fork',
  underbarPartOne: 'No Fork',
  underbarPartTwo: 'No Fork',
  twiddler: 'No Fork',
  recursion: 'No Fork',
  partOneComplete: `=IF(AND(M${rowIndex}="Yes", N${rowIndex}>=${TEST_COUNT_KOANS},` +
                   `O${rowIndex}>=${TEST_COUNT_TESTBUILDER_MIN}, O${rowIndex}<=${TEST_COUNT_TESTBUILDER_MAX},` +
                   `P${rowIndex}=${TEST_COUNT_UNDERBAR_PART_ONE}), "Yes", "No")`,
  partTwoComplete: `=IF(AND(Q${rowIndex}=${TEST_COUNT_UNDERBAR_PART_TWO}, R${rowIndex}>=${TEST_COUNT_TWIDDLER}, ISNUMBER(R${rowIndex})), "Yes", "No")`,
  partThreeComplete: `=IF(AND(S${rowIndex}>=${TEST_COUNT_RECURSION}, ISNUMBER(S${rowIndex})),"Yes", "No")`,
  allComplete: `=IF(AND(T${rowIndex}="Yes",U${rowIndex}="Yes",V${rowIndex}="Yes"),"Yes","No")`,
  completedDIF: `=IF(L${rowIndex} = 1, "N/A", IF(IFNA(MATCH(A${rowIndex}, 'Deferral Intake Form'!B:B, 0), "Not found") <> "Not found",` +
                `HYPERLINK(CONCAT("#gid=1881266534&range=", MATCH(A${rowIndex}, 'Deferral Intake Form'!B:B, 0) & ":" & MATCH(A${rowIndex}, 'Deferral Intake Form'!B:B, 0)), ` +
                '"See responses"), "Not found"))',
  m1DiagnosticTask1: `=IFNA(VLOOKUP(G${rowIndex}, 'CodeSignal Results Module 1'!A:Z, 9, false), "-")`,
  m1DiagnosticTask2: `=IFNA(VLOOKUP(G${rowIndex}, 'CodeSignal Results Module 1'!A:Z,11, false), "-")`,
  m2DiagnosticTask1: `=IFNA(VLOOKUP(G${rowIndex}, 'CodeSignal Results Module 2'!A:Z, 9, false), "-")`,
  m2DiagnosticTask2: `=IFNA(VLOOKUP(G${rowIndex}, 'CodeSignal Results Module 2'!A:Z,11, false), "-")`,
  m3DiagnosticTask1: `=IFNA(VLOOKUP(G${rowIndex}, 'CodeSignal Results Module 3'!A:Z, 9, false), "-")`,
  m3DiagnosticTask2: `=IFNA(VLOOKUP(G${rowIndex}, 'CodeSignal Results Module 3'!A:Z,11, false), "-")`,
});

module.exports = formatStudentForRepoCompletion;
