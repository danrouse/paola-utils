require('dotenv').config();
import fetch from 'node-fetch';
import Bottleneck from 'bottleneck';
import GITHUB_ORG_NAME from '../constants';

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
export { rateLimitedAPIRequest as gitHubAPIRequest };

export const validateUser = (username) => gitHubAPIRequest(`users/${username}`);

export const createTeam = (teamName) => gitHubAPIRequest(
  `orgs/${GITHUB_ORG_NAME}/teams`,
  'POST',
  { name: teamName, privacy: 'closed' },
);

export const deleteTeam = (teamName) => gitHubAPIRequest(
  `orgs/${GITHUB_ORG_NAME}/teams`,
  'DELETE',
  { name: teamName },
);

export const isUserOnTeam = (username, team) => gitHubAPIRequest(
  `orgs/${GITHUB_ORG_NAME}/teams/${team}/memberships/${username}`,
);

export const addUserToTeam = async (username, team, addAsMaintainer) => {
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

export const addUsersToTeam = (usernames, team, addAsMaintainer) => Promise.all(
  usernames.map((username) => addUserToTeam(username, team, addAsMaintainer)),
);

export const removeUserFromTeam = (username, team) => gitHubAPIRequest(
  `orgs/${GITHUB_ORG_NAME}/teams/${team}/memberships/${username}`,
  'DELETE',
);

export const removeUsersFromTeam = (usernames, team) => Promise.all(
  usernames.map((username) => removeUserFromTeam(username, team)),
);

// Create Branch
const createBranchHashCache = {};
export const createBranches = async (accountName, repoName, branchNames) => {
  const cacheKey = accountName + repoName;
  if (!createBranchHashCache.hasOwnProperty(cacheKey)) {
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
