const { readdirSync } = require('fs');
const { join, parse } = require('path');

// require all files in current directory (except this index.js),
// and expand the last one (alphabetically) as current cohort config
let newestCohortConfig;
const cohorts = {};
const cohortConfigFiles = readdirSync(join(__dirname)).sort().filter((f) => f !== 'index.js');
cohortConfigFiles.forEach((fileName) => {
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const cohortConfig = require(join(__dirname, fileName));
  cohorts[parse(fileName).name] = cohortConfig;
  newestCohortConfig = cohortConfig;
});

// allow overwriting active cohort config with env var COHORT_ID
if (process.env.COHORT_ID) {
  if (!cohorts[process.env.COHORT_ID]) {
    console.warn(`WARNING: No config found for COHORT_ID "${process.env.COHORT_ID}"!`);
  }
  newestCohortConfig = cohorts[process.env.COHORT_ID];
}

module.exports = {
  ...cohorts,
  ...newestCohortConfig,
};
