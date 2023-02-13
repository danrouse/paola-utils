const { getAllSlackUsers, getSlackInviteLink } = require('../../slack');
const { getNewStudentsFromSFDC, hasIntakeFormCompleted } = require('../../salesforce');
const { LEARN_COHORT_ID, FULL_TIME_COURSE_START_DATE } = require('../../config/cohorts');
const {
  getDeadline,
  getMissedDeadlineStudents,
  getModule1MissDetails,
  getModule2MissDetails,
  getModule3MissDetails,
} = require('./missedDeadlines');
const { getRepoCompletionStudents } = require('./getStudents');

const MERGE_FIELD_STUDENT_INFO_FORM_URL = 'www.tfaforms.com/369587?tfa_57=';

const normalizeEmail = (email) => email.toLowerCase().replace(/\./g, '');
const normalizeName = (name) => name.toLowerCase().replace(/\s/g, '');
async function getMissingSlackUsers() {
  const slackUsers = await getAllSlackUsers();
  const rosterStudents = await getRepoCompletionStudents();
  return rosterStudents.filter((rosterStudent) => !slackUsers.find(
    (slackUser) => slackUser.profile && slackUser.profile.email
      && (
        normalizeEmail(slackUser.profile.email) === normalizeEmail(rosterStudent.email)
        || normalizeName(slackUser.profile.real_name) === normalizeName(rosterStudent.fullName)
      ),
  ));
}

const formatName = (name) => name.toLowerCase().split(' ').map((part) => part.replace(/^(.)/, (char) => char.toUpperCase())).join(' ');
const numDaysAgo = (dateString) => Math.floor(
  (new Date() - new Date(dateString)) / (1000 * 60 * 60 * 24),
);

module.exports = [{
  key: 'studentInfoFormReminder',
  draftName: '[Action Required] Student Onboarding Form Submission',
  async getEmails() {
    const newStudents = await getNewStudentsFromSFDC();
    const naughtyList = newStudents
      .filter((student) => !hasIntakeFormCompleted(student));
    return naughtyList.map((student) => ({
      student,
      fields: {
        formURL: MERGE_FIELD_STUDENT_INFO_FORM_URL + student.sfdcContactId,
      },
    }));
  },
}, {
  key: 'joinSlackReminder',
  draftName: '[Action Required] SEI Precourse Slack',
  async getEmails() {
    const students = await getMissingSlackUsers();
    const staleStudents = students.filter((s) => numDaysAgo(s.dateAddedToPrecourse) > 2);
    return staleStudents.map((student) => ({
      student,
      fields: {
        name: formatName(student.preferredFirstName),
        slackJoinURL: getSlackInviteLink(),
      },
    }));
  },
}, {
  key: 'missedSoftDeadline1',
  draftName: 'SEI Precourse - Module 1 Soft Deadline Missed',
  async getEmails() {
    const students = await getMissedDeadlineStudents(1);
    return students.map((student) => ({
      student,
      fields: {
        name: formatName(student.preferredFirstName),
        deadlineDate: getDeadline(student, 1),
        details: getModule1MissDetails(student),
        learnCohortId1: LEARN_COHORT_ID,
        learnCohortId2: LEARN_COHORT_ID,
      },
    }));
  },
}, {
  key: 'missedSoftDeadline2',
  draftName: 'SEI Precourse - Module 2 Soft Deadline Missed',
  async getEmails() {
    const students = await getMissedDeadlineStudents(2);
    return students.map((student) => ({
      student,
      fields: {
        name: formatName(student.preferredFirstName),
        deadlineDate: getDeadline(student, 2),
        details: getModule2MissDetails(student),
        learnCohortId1: LEARN_COHORT_ID,
        learnCohortId2: LEARN_COHORT_ID,
      },
    }));
  },
}, {
  key: 'missedSoftDeadline3',
  draftName: 'SEI Precourse - Module 3 Soft Deadline Missed',
  async getEmails() {
    const students = await getMissedDeadlineStudents(3);
    return students.map((student) => ({
      student,
      fields: {
        name: formatName(student.preferredFirstName),
        deadlineDate: getDeadline(student, 3),
        details: getModule3MissDetails(student),
        learnCohortId1: LEARN_COHORT_ID,
        learnCohortId2: LEARN_COHORT_ID,
      },
    }));
  },
}, {
  key: 'upcomingSoftDeadline1',
  draftName: 'SEI Precourse - Upcoming Module 1 Soft Deadline',
  async getEmails() {
    const students = await getMissedDeadlineStudents(1, 8);
    return students.map((student) => ({
      student,
      fields: {
        name: formatName(student.preferredFirstName),
        deadlineDate1: getDeadline(student, 1),
        deadlineDate2: getDeadline(student, 1),
        learnCohortId1: LEARN_COHORT_ID,
        learnCohortId2: LEARN_COHORT_ID,
      },
    }));
  },
}, {
  key: 'precourseComplete',
  draftName: '🎉 Congratulations! You\'ve completed Precourse + Solution Video Password 🎉',
  async getEmails() {
    const students = (await getRepoCompletionStudents())
      .filter((student) => student.allComplete === 'Yes');
    const formatDate = (date) => {
      let ord = 'th';
      if (date.getUTCDate() === '1') ord = 'st';
      else if (date.getUTCDate() === '2') ord = 'nd';
      else if (date.getUTCDate() === '3') ord = 'rd';
      return date.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric' }) + ord;
    };
    const fullTimeDate = formatDate(new Date(FULL_TIME_COURSE_START_DATE));
    return students.map((student) => {
      const dateAndCourse = `${fullTimeDate} Full Time`;
      return {
        student,
        fields: {
          dateAndCourse,
          learnCohortId1: LEARN_COHORT_ID,
          learnCohortId2: LEARN_COHORT_ID,
        }
      };
    });
  },
}];
