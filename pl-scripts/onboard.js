/* eslint-disable no-console */
require('dotenv').config();

const { format } = require('date-fns');
const Bottleneck = require('bottleneck');
const { addStudentToGroup } = require('../googleGroups');
const { sendEmailFromDraft } = require('../googleMail');
const { loadGoogleSpreadsheet, replaceWorksheet } = require('../googleSheets');
const { addUsersToTeam, createBranches } = require('../github');
const { addStudentToCohort } = require('../learn');
const { createChannelPerStudent, sendMessageToChannel } = require('../slack');
const techMentors = require('../tech-mentors');
const { getNewStudentsFromSFDC, hasIntakeFormCompleted } = require('../salesforce');
const { exitIfCohortIsNotActive, currentCohortWeek } = require('./runOnlyDuringActiveCohort');

const {
  COHORT_ID,
  PRECOURSE_COHORT_START_DATE,
  DEADLINE_DATES,
  LEARN_COHORT_ID,
  GITHUB_STUDENT_TEAM,
  GITHUB_ORG_NAME,
  DOC_ID_HRPTIV,
  DOC_ID_PULSE,
  SHEET_ID_HRPTIV_ROSTER,
  SHEET_ID_HRPTIV_NAUGHTY_LIST,
  SLACK_JOIN_URL_STUB,
  TEST_COUNT_KOANS,
  TEST_COUNT_TESTBUILDER_MIN,
  TEST_COUNT_TESTBUILDER_MAX,
  TEST_COUNT_UNDERBAR_PART_ONE,
  TEST_COUNT_UNDERBAR_PART_TWO,
  TEST_COUNT_TWIDDLER,
  TEST_COUNT_RECURSION,
} = require('../constants');

exitIfCohortIsNotActive();

const MAX_STUDENTS_PER_RUN = 30;
const PRODUCT_CODE_CAMPUS_OVERRIDES = {
  RFP: 'RFT Pacific',
  RFE: 'RFT Eastern',
  RPP: 'RPT Pacific',
  RFC: 'RFT Central',
};

const NAUGHTY_LIST_HEADERS = [
  'fullName',
  'campus',
  'githubHandle',
  'dateAddedToPrecourse',
  'deadlineGroup\n(Keep Blank)',
  'email',
  'courseStartDate',
  'productCode',
  'stage',
  'separationStatus',
  'separationType',
  'sfdcContactId',
  'sfdcOpportunityId',
  'secondaryEmail',
  'preferredFirstName',
  'birthday',
  'phoneNumber',
  'mailingAddress',
  'emergencyContactName',
  'emergencyContactPhone',
  'emergencyContactRelationship',
  'tshirtSize',
  'tshirtFit',
  'highestDegree',
  'gender',
  'race',
  'ethnicity',
  'identifyAsLGBTQ',
  'isUSVeteran',
  'isDependentOfUSVeteran',
  'isCitizenOrPermanentResident',
  'hoodieSize',
  'addressWhileInSchool',
  'allergies',
  'otherAddress',
  'studentFunding1',
  'studentFunding1Stage',
  'paymentOption',
  'namePronunciation',
  'pronouns',
  'operatingSystem',
  'canCelebrateBirthday',
  'obligationsDuringCourse',
  'strengths',
  'otherBootcampsAppliedTo',
  'firstChoiceBootcamp',
  'whyHackReactor',
  'funFact',
  'previousPaymentType',
  'selfReportedPrepartion',
  'alumniStage',
  'salaryPriorToProgram',
  'linkedInUsername',
  'ageAtStart',
  'studentOnboardingFormCompletedOn',
];

const googleGroupFullTime = `seipw${currentCohortWeek}@galvanize.com`;
const googleGroupPartTime = currentCohortWeek <= 2
  ? `seip-rpt-w${currentCohortWeek}@galvanize.com`
  : `seip.rptw${currentCohortWeek}@galvanize.com`;
const currentDeadlineGroup = `W${currentCohortWeek}`;

const rateLimiter = new Bottleneck({
  maxConcurrent: 3,
  minTime: 333,
});
const addStudentToCohortRL = rateLimiter.wrap(addStudentToCohort);
const addStudentToGroupRL = rateLimiter.wrap(addStudentToGroup);

const isFullTime = (student) => student.campus !== 'RPT Pacific';
const isPartTime = (student) => !isFullTime(student);

const formatStudentForRepoCompletion = (student, techMentor, rowIndex) => ({
  fullName: student.fullName,
  preferredName: student.preferredFirstName,
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
                    `IMPORTRANGE("https://docs.google.com/spreadsheets/d/1v3ve2aYtO6MsG6Zjp-SBX-ote6JdWVvuYekHUst2wWw","Laser Coached Students Enrolled!A2:A"),1,false),` +
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
                `HYPERLINK(CONCAT("#gid=1881266534&range=", MATCH(A${rowIndex}, 'Deferral Intake Form'!B:B, 0) & ":" & MATCH(A${rowIndex}, 'Deferral Intake Form'!B:B, 0)), "See responses"), "Not found"))`,
});

const weightedPodSize = (pod) => Math.ceil(pod.podSize / (pod.podSizeRatio || 1));

const assignStudentsToPods = async (pulseDoc, students) => {
  const podSizes = await Promise.all(
    techMentors.map(async (techMentor) => {
      const rows = await pulseDoc.sheetsById[techMentor.repoCompletionSheetID].getRows();
      return rows.filter((row) => row.githubHandle).length;
    }),
  );
  const techMentorsWithPodSize = techMentors.map((techMentor, index) => ({
    ...techMentor,
    podSize: podSizes[index],
    repoCompletionRowsToAdd: [],
  }));

  students.forEach((student) => {
    const pod = techMentorsWithPodSize.reduce((smallestPod, currentPod) => {
      if (!smallestPod || weightedPodSize(smallestPod) > weightedPodSize(currentPod)) {
        return currentPod;
      }
      return smallestPod;
    });
    console.info(`Assigning ${student.fullName} to ${pod.name}'s pod`);

    pod.podSize += 1;
    pod.repoCompletionRowsToAdd.push(formatStudentForRepoCompletion(student, pod.name, pod.podSize + 1));
  });

  return techMentorsWithPodSize;
};

const addStudentsToRepoCompletionSheets = async (pulseDoc, pods) => {
  const repoCompletionPromises = pods
    .filter((pod) => pod.repoCompletionRowsToAdd.length > 0)
    .map((pod) => {
      const sheet = pulseDoc.sheetsById[pod.repoCompletionSheetID];
      return sheet.addRows(pod.repoCompletionRowsToAdd);
    });
  return Promise.all(repoCompletionPromises);
};

const addStudentsToLearnCohort = (students) => Promise.all(
  students.map((student) => {
    const splitName = student.fullName.split(' ');
    const learnStudent = {
      first_name: splitName[0],
      last_name: splitName[splitName.length - 1],
      email: student.email,
    };
    return addStudentToCohortRL(LEARN_COHORT_ID, learnStudent);
  }),
);

const addStudentsToGoogleGroups = (students) => Promise.all([
  ...students.filter(isFullTime)
    .map((student) => addStudentToGroupRL(googleGroupFullTime, student.email)),
  ...students.filter(isPartTime)
    .map((student) => addStudentToGroupRL(googleGroupPartTime, student.email)),
]);

const createStudentSlackChannels = (students) => {
  const fullNames = students.map((student) => student.fullName);
  return createChannelPerStudent(fullNames);
};

const addStudentsToGitHub = async (students) => {
  const gitHandles = students.map((student) => student.githubHandle);

  await addUsersToTeam(gitHandles, GITHUB_STUDENT_TEAM);
  await createBranches(GITHUB_ORG_NAME, `${COHORT_ID}-javascript-koans`, gitHandles);
  await createBranches(GITHUB_ORG_NAME, `${COHORT_ID}-testbuilder`, gitHandles);
  await createBranches(GITHUB_ORG_NAME, `${COHORT_ID}-underbar`, gitHandles);
  await createBranches(GITHUB_ORG_NAME, `${COHORT_ID}-twiddler`, gitHandles);
  await createBranches(GITHUB_ORG_NAME, `${COHORT_ID}-recursion`, gitHandles);
};

const sendWelcomeEmails = async (students) => {
  const PROGRAM_EMAIL = 'sei.precourse@galvanize.com';
  const PROGRAM_NAME = 'SEI Precourse';
  const alias = { name: PROGRAM_NAME, email: PROGRAM_EMAIL };
  const welcomeSubjectQuery = '[Action Required] Welcome to Precourse! Please Read Thoroughly 🎉';
  const deadlinesSubjectQuery = currentCohortWeek !== 4
    ? '[Review Required] Precourse Deadlines - When your work is due 🎯'
    : '[Review Required] Accelerated Pace Precourse Deadlines - When your work is due 🎯';
  const toList = [PROGRAM_EMAIL];
  const ccList = students.map((student) => student.email);
  const bccList = [];

  if (ccList.length > 0) {
    await sendEmailFromDraft(
      welcomeSubjectQuery,
      toList,
      ccList,
      bccList,
      alias,
      {
        cohortId: COHORT_ID,
        slackJoinURL: SLACK_JOIN_URL_STUB,
        learnCohortId: LEARN_COHORT_ID,
      },
    );

    await sendEmailFromDraft(
      deadlinesSubjectQuery,
      toList,
      ccList,
      bccList,
      alias,
      {
        milestoneOne: DEADLINE_DATES[currentDeadlineGroup][0],
        milestoneTwo: DEADLINE_DATES[currentDeadlineGroup][1],
        milestoneThree: DEADLINE_DATES[currentDeadlineGroup][2],
        deadlineOne: DEADLINE_DATES.Final[0],
        deadlineTwo: DEADLINE_DATES.Final[1],
        deadlineThree: DEADLINE_DATES.Final[2],
      },
    );
  }
};

const reportNewStudentsToSlack = async (newStudents, pods) => {
  let slackMessage = `🎉 ${newStudents.length} new student${newStudents.length !== 1 ? 's' : ''} added! 🎉\n`;
  slackMessage += pods
    .filter((pod) => pod.repoCompletionRowsToAdd.length > 0)
    .map((pod) => pod.repoCompletionRowsToAdd.map(
      (student) => `· ${student.fullName} → ${pod.name}`,
    ).join('\n')).join('\n');
  if (slackMessage !== '') {
    await sendMessageToChannel('new-students', slackMessage);
  }
};

const formatSFDCStudentForRoster = (student) => {
  let { campus } = student;
  Object.keys(PRODUCT_CODE_CAMPUS_OVERRIDES).forEach((key) => {
    if (student.productCode.includes(key)) {
      campus = PRODUCT_CODE_CAMPUS_OVERRIDES[key];
    }
  });
  return {
    ...student,
    campus,
    dateAddedToPrecourse: format(new Date(), 'MM/dd/yyyy'),
    secondaryEmail: student.emailSecondary,
    githubHandle: student.github,
    isUSVeteran: student.isUSVeteran ? 'Yes' : 'No',
    isDependentOfUSVeteran: student.isDependentOfUSVeteran ? 'Yes' : 'No',
    isCitizenOrPermanentResident: student.isCitizenOrPermanentResident ? 'Yes' : 'No',
    studentOnboardingFormCompletedOn: new Date(student.studentOnboardingFormCompletedOn),
  };
};

(async () => {
  const newStudents = (await getNewStudentsFromSFDC())
    .map(formatSFDCStudentForRoster)
    .sort((a, b) => a.campus.toLowerCase().localeCompare(b.campus.toLowerCase()));
  const allEligibleNewStudents = newStudents.filter(hasIntakeFormCompleted);
  const eligibleNewStudents = allEligibleNewStudents.slice(0, MAX_STUDENTS_PER_RUN);
  const naughtyListStudents = newStudents.filter((student) => !hasIntakeFormCompleted(student));

  console.info(`Adding ${eligibleNewStudents.length} out of ${allEligibleNewStudents.length} new students`);
  console.info(naughtyListStudents.length, 'students without their intake form completed');

  const sheetHRPTIV = await loadGoogleSpreadsheet(DOC_ID_HRPTIV);
  try {
    // Always update naughty list, ensuring old records are all cleared
    console.info('Updating HRPTIV naughty list...');
    await replaceWorksheet(
      sheetHRPTIV.sheetsById[SHEET_ID_HRPTIV_NAUGHTY_LIST],
      NAUGHTY_LIST_HEADERS,
      naughtyListStudents,
    );
  } catch (err) {
    console.error('Error updating HRPTIV naughty list!');
    console.error(err);
  }

  if (eligibleNewStudents.length > 0) {
    try {
      console.info('Adding students to HRPTIV roster...');
      await sheetHRPTIV.sheetsById[SHEET_ID_HRPTIV_ROSTER].addRows(eligibleNewStudents);
    } catch (err) {
      console.error('Error updating HRPTIV roster!');
      console.error(err);
    }
    const sheetPulse = await loadGoogleSpreadsheet(DOC_ID_PULSE);
    const pods = await assignStudentsToPods(sheetPulse, eligibleNewStudents);
    try {
      console.info('Adding students to Repo Completion sheets...');
      await addStudentsToRepoCompletionSheets(sheetPulse, pods);
    } catch (err) {
      console.error('Error adding students to Repo Completion sheets!');
      console.error(err);
    }
    try {
      console.info('Adding students to the Learn cohort...');
      await addStudentsToLearnCohort(eligibleNewStudents);
    } catch (err) {
      console.error('Error adding students to the Learn cohort!');
      console.error(err);
    }
    try {
      console.info('Adding students to Google Groups...');
      await addStudentsToGoogleGroups(eligibleNewStudents);
    } catch (err) {
      console.error('Error adding students to Google Groups!');
      console.error(err);
    }
    try {
      console.info('Creating Slack channels...');
      await createStudentSlackChannels(eligibleNewStudents);
    } catch (err) {
      console.error('Error creating Slack channels!');
      console.error(err);
    }
    try {
      console.info('Adding students to GitHub team and creating branches...');
      await addStudentsToGitHub(eligibleNewStudents);
    } catch (err) {
      console.error('Error adding students to GitHub!');
      console.error(err);
    }
    try {
      console.info('Sending welcome emails to new students...');
      await sendWelcomeEmails(eligibleNewStudents);
    } catch (err) {
      console.error('Error sending welcome emails to new students!');
      console.error(err);
    }
    console.info('Reporting to Slack...');
    await reportNewStudentsToSlack(eligibleNewStudents, pods);
  }

  console.info('Done!');
})();
