require('dotenv').config();
const fetch = require('node-fetch');
const { GITHUB_API_TEAMS } = require('../constants');
const {
  validateUser,
  isUserOnTeam,
  addUserToTeam,
  removeUserFromTeam,
  addUsersToTeam,
  removeUsersFromTeam,
} = require('.');

const GITHUB_TEAM_USERNAME = 'paola-test-team';
const GITHUB_TEST_USER = 'murphpaolatestuser';
const GITHUB_INVALID_USER = 'notarealuser***';
const HEADERS = { Authorization: `token ${process.env.GIT_AUTH_TOKEN}` };

const addUser = async () => {
  await fetch(
    `${GITHUB_API_TEAMS}/${GITHUB_TEAM_USERNAME}/memberships/${GITHUB_TEST_USER}`,
    { method: 'PUT', headers: HEADERS },
  );
};

const removeUser = async () => {
  await fetch(
    `${GITHUB_API_TEAMS}/${GITHUB_TEAM_USERNAME}/memberships/${GITHUB_TEST_USER}`,
    { method: 'DELETE', headers: HEADERS },
  );
};

beforeAll(() => {
  removeUser();
});

describe('validateUser', () => {
  test('Should return true if valid github user', async () => {
    const isValid = await validateUser(GITHUB_TEST_USER);
    expect(isValid).toBe(true);
  });

  test('Should return false if invalid github user', async () => {
    const isValid = await validateUser(GITHUB_INVALID_USER);
    expect(isValid).toBe(false);
  });
});

describe('isUserOnTeam', () => {
  test('Should return true if user is on team', async () => {
    await addUser();
    const userOnTeam = await isUserOnTeam(GITHUB_TEST_USER, GITHUB_TEAM_USERNAME);
    expect(userOnTeam).toBe(true);
  });

  test('Should return false if user is not on team', async () => {
    await removeUser();
    const userOnTeam = await isUserOnTeam(GITHUB_TEST_USER, GITHUB_TEAM_USERNAME);
    expect(userOnTeam).toBe(false);
  });

  test('Should return false if user does not exist', async () => {
    const userOnTeam = await isUserOnTeam(GITHUB_INVALID_USER, GITHUB_TEAM_USERNAME);
    expect(userOnTeam).toBe(false);
  });
});

describe('addUserToTeam', () => {
  test('Should return true if successfully added user', async () => {
    await removeUser();
    const addedUser = await addUserToTeam(GITHUB_TEST_USER, GITHUB_TEAM_USERNAME);
    expect(addedUser).toBe(true);
  });
  test('Should return false if user does not exist', async () => {
    const addedUser = await addUserToTeam(GITHUB_INVALID_USER, GITHUB_TEAM_USERNAME);
    expect(addedUser).toBe(false);
  });
});

describe('removeUserFromTeam', () => {
  test('Should return true if successfully removed user', async () => {
    const removedUser = await removeUserFromTeam(GITHUB_TEST_USER, GITHUB_TEAM_USERNAME);
    expect(removedUser).toBe(true);
  });

  test('Should return false if user is invalid', async () => {
    const removedUser = await removeUserFromTeam(GITHUB_INVALID_USER, GITHUB_TEAM_USERNAME);
    expect(removedUser).toBe(false);
  });
});

describe('addUsersToTeam', () => {
  test('Should return true if all GitHub users are successfully added to the GitHub team', async () => {
    const usersWereAdded = await addUsersToTeam(['anthonypecchillo', 'murphgrainger'], GITHUB_TEAM_USERNAME);
    expect(usersWereAdded).toBe(true);
  });

  test('Should return an errror if at least one user could not be added', async () => {
    const usersWereAdded = await addUsersToTeam(['anthonypecchillo', 'murphgrainger***'], GITHUB_TEAM_USERNAME);
    expect(usersWereAdded).toContain('Error adding');
  });
});

describe('removeUsersFromTeam', () => {
  test('Should return true if all GitHub users are successfully removed from the GitHub team', async () => {
    const usersWereRemoved = await removeUsersFromTeam(['anthonypecchillo', 'murphgrainger'], GITHUB_TEAM_USERNAME);
    expect(usersWereRemoved).toBe(true);
  });

  test('Should return an errror if at least one user could not be removed', async () => {
    const usersWereRemoved = await removeUsersFromTeam(['anthonypecchillo', 'murphgrainger***'], GITHUB_TEAM_USERNAME);
    expect(usersWereRemoved).toContain('Error removing');
  });
});
