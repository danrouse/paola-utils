const {
  DEADLINE_DATES,
  TEST_COUNT_TESTBUILDER_MIN,
  TEST_COUNT_TESTBUILDER_MAX,
  TEST_COUNT_UNDERBAR_PART_ONE,
  TEST_COUNT_UNDERBAR_PART_TWO,
  TEST_COUNT_TWIDDLER,
  TEST_COUNT_RECURSION,
} = require('../../config/cohorts');
const { getRepoCompletionStudents } = require('./getStudents');

const NO_FORK_TEXT = 'No Fork';
const ERROR_TEXT = 'Timed Out';
const TIMED_OUT_TEXT = 'Timed Out';
const MESSAGE_NO_FORKS = 'According to our records, you haven\'t forked any of the assignment repositories.';

const getDeadline = (student, moduleNumber, final) => {
  const { deadlineGroup } = student;
  let deadlinesKey = final ? 'Final' : deadlineGroup;
  if (!(deadlinesKey in DEADLINE_DATES)) deadlinesKey = 'W4'; // give up :(
  return DEADLINE_DATES[deadlinesKey][moduleNumber - 1];
};

async function getMissedDeadlineStudents(moduleNumber, daysInAdvance) {
  const repoCompletionStudents = await getRepoCompletionStudents();
  return repoCompletionStudents.filter((student) => {
    const softDeadline = getDeadline(student, moduleNumber);
    const hardDeadline = getDeadline(student, moduleNumber, true);
    const isModuleComplete = [
      student.partOneComplete === 'Yes',
      student.partTwoComplete === 'Yes',
      student.partThreeComplete === 'Yes',
    ];
    if (softDeadline === hardDeadline) return false;
    if (student.willMissSoftDeadline) return false;

    const dateParts = softDeadline.split('/');
    const cutoff = new Date(dateParts[2], Number(dateParts[0]) - 1, Number(dateParts[1]) + 1);
    if (!daysInAdvance) {
      return cutoff < new Date() && !isModuleComplete[moduleNumber - 1];
    }
    // if daysInAdvance is provided, only return students within the window
    // between cutoff and cutoff - daysInAdvance
    const endingCutoff = new Date(cutoff);
    cutoff.setDate(Number(dateParts[1]) + 1 - daysInAdvance);
    const now = new Date();
    return cutoff < now
      && endingCutoff > now
      && !isModuleComplete[moduleNumber - 1];
  });
}

function getProjectCompletionMessage(projectName, repoCompletionValue, isComplete) {
  /* eslint-disable no-else-return */
  if (repoCompletionValue === NO_FORK_TEXT) {
    return `${projectName} has not been forked`;
  } else if (repoCompletionValue === TIMED_OUT_TEXT) {
    return `${projectName} is <b>timing out</b> (taking more than 30 seconds to execute)`;
  } else if (repoCompletionValue === ERROR_TEXT) {
    return `${projectName} is throwing an error`;
  } else if (isComplete) {
    return `${projectName} is complete ✅`;
  }
  return `${projectName} is <b>not complete</b> ❌`;

  /* eslint-enable no-else-return */
}

function getMissedDeadlineDetails(student, projects) {
  // eslint-disable-next-line no-unused-vars
  if (projects.every(([projectName, projectValue]) => projectValue === NO_FORK_TEXT)) {
    return MESSAGE_NO_FORKS;
  }

  const messages = projects.map((project) => getProjectCompletionMessage(...project));
  if (messages.length > 1) {
    messages[messages.length - 1] = `and ${messages[messages.length - 1]}`;
  }
  return `According to our records, ${messages.join(', ')}.`;
}

function getModule1MissDetails(student) {
  return getMissedDeadlineDetails(student, [
    ['JavaScript Koans', student.javascriptKoans, student.koansMinReqs === 'Yes'],
    ['Testbuilder', student.testbuilder, Number(student.testbuilder) >= TEST_COUNT_TESTBUILDER_MIN && Number(student.testbuilder) < TEST_COUNT_TESTBUILDER_MAX],
    ['Underbar Part 1', student.underbarPartOne, Number(student.underbarPartOne) >= TEST_COUNT_UNDERBAR_PART_ONE],
  ]);
}

function getModule2MissDetails(student) {
  return getMissedDeadlineDetails(student, [
    ['Underbar Part 2', student.underbarPartTwo, Number(student.underbarPartTwo) >= TEST_COUNT_UNDERBAR_PART_TWO],
    ['Twiddler', student.twiddler, Number(student.twiddler) >= TEST_COUNT_TWIDDLER],
  ]);
}

function getModule3MissDetails(student) {
  return getMissedDeadlineDetails(student, [
    ['Recursion', student.recursion, Number(student.recursion) >= TEST_COUNT_RECURSION],
  ]);
}

module.exports = {
  getModule1MissDetails,
  getModule2MissDetails,
  getModule3MissDetails,
  getMissedDeadlineStudents,
  getDeadline,
};
