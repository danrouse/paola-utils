require('dotenv').config();

const { addUsersToTeam, gitHubAPIRequest } = require('../github');
const { GITHUB_STUDENT_TEAM } = require('../config/cohorts');
const { getRepoCompletionStudents } = require('./emails/getStudents');

const getGitHubTeamMembers = async () => {
  const results = [];
  let page = 1;
  let hasMoreResults = true;
  do {
    const result = await gitHubAPIRequest(`orgs/hackreactor/teams/${GITHUB_STUDENT_TEAM}/members?role=member&per_page=100&page=${page}`, 'GET');
    hasMoreResults = result.length !== 0;
    results.push(...result);
    page += 1;
  } while (hasMoreResults);
  return results;
};

(async () => {
  console.info('Getting GitHub team members...');
  const githubTeamMembers = (await getGitHubTeamMembers()).map((user) => user.login.toLowerCase());
  console.info('Found', githubTeamMembers.length, 'GitHub team members!');

  console.info('Getting pending team invitations...');
  const pendingTeamMembers = (
    await gitHubAPIRequest(`orgs/hackreactor/teams/${GITHUB_STUDENT_TEAM}/invitations?per_page=100`, 'GET')
  ).map((user) => user.login.toLowerCase());
  console.info('Found', pendingTeamMembers.length, 'pending invitations!');

  console.info('Retrieving roster from Pulse...');
  const students = await getRepoCompletionStudents();
  const githubHandles = students.map((student) => student.githubHandle.toLowerCase()).filter((student) => student);
  console.info('Found', githubHandles.length, 'student records from roster');

  const studentsMissingOnTeam = githubHandles.filter((githubHandle) => !githubTeamMembers.includes(githubHandle) && !pendingTeamMembers.includes(githubHandle));
  console.info('Found', studentsMissingOnTeam.length, 'students on the roster who are not in the team and do not have pending invites');

  console.log(studentsMissingOnTeam);

  console.info('Sending fresh invitations...');
  await addUsersToTeam(studentsMissingOnTeam, GITHUB_STUDENT_TEAM);
  console.info('Done!');
})();
