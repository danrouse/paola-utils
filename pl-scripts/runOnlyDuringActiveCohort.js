const { PRECOURSE_COHORT_START_DATE } = require('../constants');

const WEEK_DURATION_MS = 1000 * 60 * 60 * 24 * 7;
const currentDate = new Date();
function getCurrentCohortWeek() {
  return Math.ceil((currentDate - new Date(PRECOURSE_COHORT_START_DATE)) / WEEK_DURATION_MS);
}
const currentCohortWeek = getCurrentCohortWeek();

function exitIfCohortIsNotActive(minWeekNumber = 1, maxWeekNumber = 4) {
  if (
    currentCohortWeek < minWeekNumber || // no onboarding in W0
    currentCohortWeek > maxWeekNumber || // or after W4
    // or after 5PM PT on Friday of W4 (5PM PT = midnight/1AM UTC next day)
    (currentCohortWeek === 4 && currentDate.getUTCDay() > 5 && currentDate.getUTCHours() > 0)
  ) {
    console.error(`Cohort week out of range (${currentCohortWeek}), exiting`);
    process.exit(0);
  }
}

module.exports = {
  exitIfCohortIsNotActive,
  currentCohortWeek,
};
