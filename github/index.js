require('dotenv').config();
const fetch = require('node-fetch');
const Bottleneck = require('bottleneck');
const { GITHUB_ORG_NAME } = require('../config');

const headers = { Authorization: `token ${process.env.GITHUB_AUTH_TOKEN}` };

function gitHubAPIRequest(endpoint, method, body) {
  return fetch(
    `https://api.github.com/${endpoint}`,
    { method, body: typeof body === 'string' ? body : JSON.stringify(body), headers },
  ).then((res) => res.json());
}
const rateLimiter = new Bottleneck({
  maxConcurrent: 3,
  minTime: 333,
});
const rateLimitedAPIRequest = rateLimiter.wrap(gitHubAPIRequest);

const validateUser = (username) => gitHubAPIRequest(`users/${username}`);

const createTeam = (teamName) => gitHubAPIRequest(
  `orgs/${GITHUB_ORG_NAME}/teams`,
  'POST',
  { name: teamName, privacy: 'closed' },
);

const deleteTeam = (teamName) => gitHubAPIRequest(
  `orgs/${GITHUB_ORG_NAME}/teams`,
  'DELETE',
  { name: teamName },
);

const isUserOnTeam = (username, team) => gitHubAPIRequest(
  `orgs/${GITHUB_ORG_NAME}/teams/${team}/memberships/${username}`,
);

const addUserToTeam = async (username, team, addAsMaintainer) => {
  const res = await gitHubAPIRequest(
    `orgs/${GITHUB_ORG_NAME}/teams/${team}/memberships/${username}`,
    'PUT',
    { role: addAsMaintainer ? 'maintainer' : 'member' },
  );
  if (res.message === 'Not Found') {
    console.warn(`WARNING: GitHub user ${username} does not exist!`);
  }
  return res;
};

const addUsersToTeam = (usernames, team, addAsMaintainer) => Promise.all(
  usernames.map((username) => addUserToTeam(username, team, addAsMaintainer)),
);

const removeUserFromTeam = (username, team) => gitHubAPIRequest(
  `orgs/${GITHUB_ORG_NAME}/teams/${team}/memberships/${username}`,
  'DELETE',
);

const removeUsersFromTeam = (usernames, team) => Promise.all(
  usernames.map((username) => removeUserFromTeam(username, team)),
);

// Create Branch
const createBranchHashCache = {};
const createBranches = async (accountName, repoName, branchNames) => {
  const cacheKey = accountName + repoName;
  if (!createBranchHashCache.hasOwnProperty(cacheKey)) { // eslint-disable-line no-prototype-builtins
    const response = await rateLimitedAPIRequest(`repos/${accountName}/${repoName}/git/ref/heads/master`);
    createBranchHashCache[cacheKey] = response.object.sha;
  }
  const promises = branchNames.map((branchName) => rateLimitedAPIRequest(
    `repos/${accountName}/${repoName}/git/refs`,
    'POST',
    { ref: `refs/heads/${branchName}`, sha: createBranchHashCache[cacheKey] },
  ));
  const result = await Promise.all(promises);
  return result.every((res) => res.ref);
};

const getForksCache = {};
const getForks = async (baseRepoName) => {
  if (getForksCache[baseRepoName]) return getForksCache[baseRepoName];
  const forks = {};
  let page = 1, response;
  do {
    response = await gitHubAPIRequest(
      `repos/${GITHUB_ORG_NAME}/${baseRepoName}/forks?per_page=100&page=${page}`,
      'GET',
    );
    response.forEach((fork) => { forks[fork.owner.login.toLowerCase()] = fork.name; });
    page += 1;
  } while (response && response.length);
  getForksCache[baseRepoName] = forks;
  return forks;
};

const getFork = async (baseRepoName, githubHandle) => {
  if (!getForksCache[baseRepoName]) {
    await getForks(baseRepoName);
  }
  return getForksCache[baseRepoName][githubHandle.toLowerCase()];
};

module.exports = {
  gitHubAPIRequest: rateLimitedAPIRequest,
  validateUser,
  createTeam,
  deleteTeam,
  isUserOnTeam,
  addUserToTeam,
  addUsersToTeam,
  removeUserFromTeam,
  removeUsersFromTeam,
  createBranches,
  getForks,
  getFork,
};
