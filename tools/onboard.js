require('dotenv').config();

const Bottleneck = require('bottleneck');
const { sendEmailFromDraft } = require('../googleMail');
const { loadGoogleSpreadsheet, replaceWorksheet } = require('../googleSheets');
const { addUsersToTeam, createBranches } = require('../github');
const { addStudentToCohort } = require('../learn');
const { createChannelPerStudent, sendMessageToChannel, getSlackInviteLink } = require('../slack');
const techMentors = require('../config/techMentors');
const { getNewStudentsFromSFDC, hasIntakeFormCompleted, formatSFDCStudentForRoster } = require('../salesforce');
const { exitIfCohortIsNotActive, currentCohortWeek } = require('./runOnlyDuringActiveCohort');
const formatStudentForRepoCompletion = require('./formatStudentForRepoCompletion');

const {
  GITHUB_ORG_NAME,
  DOC_ID_HRPTIV,
  SHEET_ID_HRPTIV_NAUGHTY_LIST,
} = require('../config');
const {
  COHORT_ID,
  DEADLINE_DATES,
  LEARN_COHORT_ID,
  GITHUB_STUDENT_TEAM,
  DOC_ID_PULSE,
  SHEET_ID_HRPTIV_ROSTER,
} = require('../config/cohorts');

exitIfCohortIsNotActive();

const TESTING_MODE = false;
const MAX_STUDENTS_PER_RUN = 30;

const PROGRAM_EMAIL = 'sei.precourse@galvanize.com';
const PROGRAM_NAME = 'SEI Precourse';
const EMAIL_ALIAS = { name: PROGRAM_NAME, email: PROGRAM_EMAIL };

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

const currentDeadlineGroup = `W${currentCohortWeek}`;

const rateLimiter = new Bottleneck({
  maxConcurrent: 3,
  minTime: 333,
});
const addStudentToCohortRL = rateLimiter.wrap(addStudentToCohort);

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
    pod.repoCompletionRowsToAdd.push(formatStudentForRepoCompletion(student, pod.name, currentDeadlineGroup));
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

const createStudentSlackChannels = (students) => {
  const fullNames = students.map((student) => student.fullName);
  return createChannelPerStudent(fullNames);
};

const addStudentsToGitHub = async (students) => {
  const INVALID_GITHUB_HANDLE_DRAFT_NAME = '[Action Required] GitHub Username Confirmation';

  const gitHandles = students.map((student) => student.githubHandle);

  const addToTeamResponse = await addUsersToTeam(gitHandles, GITHUB_STUDENT_TEAM);
  for (const index in addToTeamResponse) {
    if (addToTeamResponse[index].message === 'Not Found') {
      const student = students[index];
      await sendEmailFromDraft(
        INVALID_GITHUB_HANDLE_DRAFT_NAME,
        [student.email],
        [PROGRAM_EMAIL],
        [],
        EMAIL_ALIAS,
        {
          name: student.preferredFirstName,
          githubHandle: student.githubHandle,
        },
      );

      const message = `⚠ GitHub handle "${student.githubHandle}" not found for student ${student.fullName}! The student has been emailed.`;
      await sendMessageToChannel('new-students', message);
    }
  }
  await createBranches(GITHUB_ORG_NAME, `${COHORT_ID}-javascript-koans`, gitHandles);
  await createBranches(GITHUB_ORG_NAME, `${COHORT_ID}-testbuilder`, gitHandles);
  await createBranches(GITHUB_ORG_NAME, `${COHORT_ID}-underbar`, gitHandles);
  await createBranches(GITHUB_ORG_NAME, `${COHORT_ID}-twiddler`, gitHandles);
  await createBranches(GITHUB_ORG_NAME, `${COHORT_ID}-recursion`, gitHandles);
};

const sendWelcomeEmails = async (students) => {
  const WELCOME_EMAIL_DRAFT_SUBJECT = '[Action Required] Welcome to SEI Precourse! Please Read Thoroughly 🎉';
  /*
  NOTE: Combined emails don't handle having separate copy for the urgency of W4 students!
        Resolve this before W4!
  const deadlinesSubjectQuery = currentCohortWeek !== 4
    ? '[Review Required] Precourse Deadlines - When your work is due 🎯'
    : '[Review Required] Accelerated Pace Precourse Deadlines - When your work is due 🎯';
  */
  for (const student of students) {
    await sendEmailFromDraft(
      WELCOME_EMAIL_DRAFT_SUBJECT,
      [student.email],
      [PROGRAM_EMAIL],
      [],
      EMAIL_ALIAS,
      {
        preferredFirstName: student.preferredFirstName,
        cohortId: COHORT_ID,
        slackJoinURL: getSlackInviteLink(),
        learnCohortId: LEARN_COHORT_ID,
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

(async () => {
  console.info(`Onboarding, week #${currentCohortWeek}`);
  if (TESTING_MODE) console.info('RUNNING IN TESTING MODE: ONLY ADDING A TEST USER');

  const newStudents = (await getNewStudentsFromSFDC())
    .map(formatSFDCStudentForRoster)
    .sort((a, b) => a.campus.toLowerCase().localeCompare(b.campus.toLowerCase()));
  const allEligibleNewStudents = newStudents.filter(hasIntakeFormCompleted);
  let eligibleNewStudents = allEligibleNewStudents.slice(0, MAX_STUDENTS_PER_RUN);
  const naughtyListStudents = newStudents.filter((student) => !hasIntakeFormCompleted(student));

  console.info(`Adding ${eligibleNewStudents.length} out of ${allEligibleNewStudents.length} new students`);
  console.info(naughtyListStudents.length, 'students without their intake form completed');

  const sheetHRPTIV = await loadGoogleSpreadsheet(DOC_ID_HRPTIV);

  if (!TESTING_MODE) {
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
  }

  if (TESTING_MODE) {
    eligibleNewStudents = [{
      preferredFirstName: 'Test',
      fullName: 'Test Teststudent',
      email: 'paola+test@galvanize.com',
      githubHandle: 'hackreactor-paola',
    }];
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
