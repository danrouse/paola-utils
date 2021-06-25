const fetch = require('node-fetch');
const { GITHUB_API_USERS, GITHUB_API_TEAMS } = require('../constants');

// ------------------------------
// GitHub API Integrations
// ------------------------------

const headers = { Authorization: `token ${process.env.GIT_AUTH_TOKEN}` };

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
exports.addUsersToTeam = async (usernames, team) => {
  try {
    const promises = usernames.map(async (username) => {
      const addUser = await fetch(
        `${GITHUB_API_TEAMS}/${team}/memberships/${username}`,
        { method: 'PUT', headers },
      );
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
exports.createBranches = async (accountName, repoName, commitHash, branchNames) => {
  const promises = branchNames.map(async (branchName) => {
    const newBranch = await fetch(
      `https://api.github.com/repos/${accountName}/${repoName}/git/refs`,
      { method: 'POST', headers, body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: commitHash }) },
    );
    return newBranch.status;
  });
  const result = await Promise.all(promises);
  return result.every((status) => status === 201);
};
