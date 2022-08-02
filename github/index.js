const fetch = require('node-fetch');
const { GITHUB_API_USERS, GITHUB_API_TEAMS } = require('../constants');

const headers = { Authorization: `token ${process.env.GITHUB_AUTH_TOKEN}` };

function gitHubAPIRequest(endpoint, method, body) {
  return fetch(
    `https://api.github.com/${endpoint}`,
    { method, body: typeof body === 'string' ? body : JSON.stringify(body), headers },
  ).then((res) => res.json());
}

// Validate a github username exists
exports.validateUser = async (username) => {
  try {
    const response = await fetch(
      `${GITHUB_API_USERS}/${username}`,
      { headers },
    );
    return response.status === 200;
  } catch (error) {
    return error;
  }
};

exports.createTeam = async (teamName) => {
  try {
    const data = {
      name: teamName,
      // privacy: 'secret',
      privacy: 'closed',
    };
    const response = await fetch(
      GITHUB_API_TEAMS,
      { method: 'POST', headers, body: JSON.stringify(data) },
    );
    const res = await response.json();
    if (res.errors) throw new Error(res.errors[0].message);
    return response.status === 201;
  } catch (error) {
    return error.message;
  }
};

exports.deleteTeam = async (teamName) => {
  try {
    const data = {
      name: teamName,
      // privacy: 'secret',
    };
    const response = await fetch(
      GITHUB_API_TEAMS,
      { method: 'DELETE', headers, body: JSON.stringify(data) },
    );
    const res = await response.json();
    if (res.errors) throw new Error(res.errors[0].message);
    return response.status === 200;
  } catch (error) {
    return error.message;
  }
};

// Determine if username is member of provided GitHub team
exports.isUserOnTeam = async (username, team) => {
  try {
    const response = await fetch(
      `${GITHUB_API_TEAMS}/${team}/memberships/${username}`,
      { headers },
    );
    return response.status === 200;
  } catch (error) {
    return error;
  }
};

// Add a username to a GitHub team
exports.addUserToTeam = async (username, team) => {
  try {
    const response = await fetch(
      `${GITHUB_API_TEAMS}/${team}/memberships/${username}`,
      { method: 'PUT', headers },
    );
    return response.status === 200;
  } catch (error) {
    return error;
  }
};

// Delete a username from a team
exports.removeUserFromTeam = async (username, team) => {
  try {
    const response = await fetch(
      `${GITHUB_API_TEAMS}/${team}/memberships/${username}`,
      { method: 'DELETE', headers },
    );
    return response.status === 204;
  } catch (error) {
    return error;
  }
};

// Batch add usernames to a GitHub team
exports.addUsersToTeam = async (usernames, team, addAsMaintainer) => {
  try {
    const payload = { method: 'PUT', headers };
    if (addAsMaintainer) {
      payload.body = JSON.stringify({ role: 'maintainer' });
    }

    const promises = usernames.map(async (username) => {
      const addUser = await fetch(
        `${GITHUB_API_TEAMS}/${team}/memberships/${username}`,
        payload,
      );
      if (addUser.status === 404) {
        console.log(`GitHub user ${username} does not exist! Cannot add to team.`);
      }
      if (addUser.status !== 200) {
        throw new Error(`Error adding ${username}`);
      }
      return addUser.status;
    });
    const results = await Promise.all(promises);
    return results.every((status) => status === 200);
  } catch (error) {
    return error.message;
  }
};

// Batch remove usernames from a GitHub team
exports.removeUsersFromTeam = async (usernames, team) => {
  try {
    const promises = usernames.map(async (username) => {
      const removeUser = await fetch(
        `${GITHUB_API_TEAMS}/${team}/memberships/${username}`,
        { method: 'DELETE', headers },
      );
      if (removeUser.status !== 204) {
        throw new Error(`Error removing ${username}`);
      }
      return removeUser.status;
    });
    const result = await Promise.all(promises);
    return result.every((status) => status === 204);
  } catch (error) {
    return error.message;
  }
};

// Create Branch
const createBranchHashCache = {};
const Bottleneck = require('bottleneck');
const rateLimiter = new Bottleneck({
  maxConcurrent: 3,
  minTime: 333,
});
const rateLimitedAPIRequest = rateLimiter.wrap(gitHubAPIRequest);
exports.gitHubAPIRequest = rateLimitedAPIRequest;
exports.createBranches = async (accountName, repoName, branchNames) => {
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
