const fetch = require('node-fetch');
const { LEARN_API_COHORTS } = require('../constants');

const headers = {
  Authorization: `Bearer ${process.env.LEARN_TOKEN}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

// ------------------------------
// Learn API Integrations
// ------------------------------

// Read all students in a cohort
let cachedStudents;
exports.getAllStudentsInCohort = async (cohortId, force) => {
  if (cachedStudents && !force) return cachedStudents;
  try {
    const response = await fetch(
      `${LEARN_API_COHORTS}/${cohortId}/users`,
      { headers },
    );
    const json = await response.json();
    if (json.error || json.message) throw new Error(json.error || json.message);
    cachedStudents = json;
    return cachedStudents;
  } catch (error) {
    return error.message;
  }
};

// Write a student to a cohort
exports.addStudentToCohort = async (cohortId, student) => {
  try {
    const response = await fetch(
      `${LEARN_API_COHORTS}/${cohortId}/users`,
      { method: 'POST', body: JSON.stringify(student), headers },
    );
    const json = await response.json();
    if (json.error || json.message) throw new Error(json.error || json.message);
    return json.status;
  } catch (error) {
    return error.message;
  }
};

// Validate that a student is enrolled in a cohort
exports.validateStudentEnrollment = async (cohortId, email) => {
  try {
    const students = await exports.getAllStudentsInCohort(cohortId);
    if (!Array.isArray(students)) throw new Error(students);
    const activeStudent = students.find((student) => student.email === email);
    if (!activeStudent) throw new Error('No active student found with provided email.');
    return activeStudent;
  } catch (error) {
    return error.message;
  }
};

// Validate that a student is enrolled in a cohort
exports.validateStudentEnrollmentByID = async (cohortId, id) => {
  try {
    const students = await exports.getAllStudentsInCohort(cohortId);
    if (!Array.isArray(students)) throw new Error(students);
    const activeStudent = students.find((student) => student.id === id);
    if (!activeStudent) throw new Error('No active student found with provided ID.');
    return activeStudent;
  } catch (error) {
    return error.message;
  }
};

// Delete a student from a cohort
exports.removeStudentFromCohort = async (cohortId, email) => {
  try {
    const students = await exports.getAllStudentsInCohort(cohortId);
    if (!Array.isArray(students)) throw new Error(students);
    const activeStudent = students.find((student) => student.email === email);
    if (!activeStudent) throw new Error('No active student found with provided email.');
    const response = await fetch(
      `${LEARN_API_COHORTS}/${cohortId}/users/${activeStudent.id}`,
      { method: 'DELETE', headers },
    );
    const json = await response.json();
    if (json.error || json.message) throw new Error(json.error || json.message);
    return json.status;
  } catch (error) {
    return `Error removing ${email} from Learn cohort: ${error.message}`;
  }
};

exports.removeStudentFromCohortByID = async (cohortId, id) => {
  try {
    const response = await fetch(
      `${LEARN_API_COHORTS}/${cohortId}/users/${id}`,
      { method: 'DELETE', headers },
    );
    const json = await response.json();
    if (json.error || json.message || json.status === '404') {
      throw new Error(json.error || json.message
        || 'No active student found with provided ID.');
    }
    return json.status;
  } catch (error) {
    return error.message;
  }
};

// Write a new cohort
exports.createNewCohort = async (options) => {
  try {
    const response = await fetch(
      `${LEARN_API_COHORTS}`,
      { method: 'POST', body: JSON.stringify(options), headers },
    );
    const json = await response.json();
    if (json.error || json.message) throw new Error(json.error || json.message);
    return json.uid;
  } catch (error) {
    return error.message;
  }
};
