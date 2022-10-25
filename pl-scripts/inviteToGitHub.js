require('dotenv').config();
const { addUsersToTeam, createBranches } = require('../github');
const { GITHUB_STUDENT_TEAM, COHORT_ID, GITHUB_ORG_NAME } = require('../constants');

(async () => {
  if (!process.argv[2]) {
    console.log('A GitHub handle must be supplied when calling this script');
    process.exit(1);
  }
  console.log(`Adding ${process.argv[2]} to GitHub team ${GITHUB_STUDENT_TEAM}...`);
  const gitHandles = [process.argv[2]];
  const res = await addUsersToTeam(gitHandles, GITHUB_STUDENT_TEAM);
  console.log(`Result: ${res}`);
  console.log(`Creating branches for ${process.argv[2]}...`);
  await createBranches(GITHUB_ORG_NAME, `${COHORT_ID}-javascript-koans`, gitHandles);
  await createBranches(GITHUB_ORG_NAME, `${COHORT_ID}-testbuilder`, gitHandles);
  await createBranches(GITHUB_ORG_NAME, `${COHORT_ID}-underbar`, gitHandles);
  await createBranches(GITHUB_ORG_NAME, `${COHORT_ID}-twiddler`, gitHandles);
  await createBranches(GITHUB_ORG_NAME, `${COHORT_ID}-recursion`, gitHandles);
  console.log('Done!');
})();
