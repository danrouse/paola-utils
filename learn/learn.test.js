require('dotenv').config();
const fetch = require('node-fetch');
const { LEARN_API_COHORTS } = require('../config');

const {
  getAllStudentsInCohort,
  validateStudentEnrollment,
  validateStudentEnrollmentByID,
  addStudentToCohort,
  removeStudentFromCohort,
  removeStudentFromCohortByID,
} = require('.');

const TEST_LEARN_COHORT_ID = 2024;
const TEST_STUDENT = {
  id: 52763,
  first_name: 'Paola',
  last_name: 'Precourse',
  email: 'paola@galvanize.com',
};
const headers = {
  Authorization: `Bearer ${process.env.LEARN_TOKEN}`,
  'Content-Type': 'application/json',
};

const getStudents = async () => {
  const response = await fetch(
    `${LEARN_API_COHORTS}/${TEST_LEARN_COHORT_ID}/users`,
    { headers },
  );
  return response.json();
};

const addStudent = async () => {
  const response = await fetch(
    `${LEARN_API_COHORTS}/${TEST_LEARN_COHORT_ID}/users`,
    { method: 'POST', body: JSON.stringify(TEST_STUDENT), headers },
  );
  const json = await response.json();
  return json;
};

beforeAll(async () => {
  const students = await getStudents();
  const activeStudent = students.find(
    (student) => student.email === TEST_STUDENT.email,
  );
  if (activeStudent) {
    await fetch(
      `${LEARN_API_COHORTS}/${TEST_LEARN_COHORT_ID}/users/${activeStudent.id}`,
      { method: 'DELETE', headers },
    );
  }
});

describe('getAllStudentsInCohort', () => {
  test('Should expect an array of students', async () => {
    const testStudents = await getStudents();
    const students = await getAllStudentsInCohort(TEST_LEARN_COHORT_ID);
    expect(students).toHaveLength(testStudents.length);
  });

  test('Should expect an error if the cohortId provided is invalid', async () => {
    const students = await getAllStudentsInCohort(0);
    expect(students).toBe('The requested resource could not be found');
  });
});

describe('addStudentToCohort', () => {
  test('Should expect an ok status if successfully added student to cohort', async () => {
    const status = await addStudentToCohort(TEST_LEARN_COHORT_ID, TEST_STUDENT);
    expect(status).toBe('ok');
  });

  test('Should expect an already-exists status if student already exists in cohort', async () => {
    const status = await addStudentToCohort(TEST_LEARN_COHORT_ID, TEST_STUDENT);
    expect(status).toBe('already-exists');
  });

  test('Should expect an error if the cohortId provided is invalid', async () => {
    const status = await addStudentToCohort(0, TEST_STUDENT);
    expect(status).toBe('The requested resource could not be found');
  });

  test('Should expect an error if the student parameters are invalid', async () => {
    const status = await addStudentToCohort(TEST_LEARN_COHORT_ID, { name: 'paola' });
    expect(status).toContain('Validation Error');
  });
});

describe('validateStudentEnrollment', () => {
  test('Should expect a student object if student is in cohort', async () => {
    const expectedProps = [
      'id',
      'uid',
      'first_name',
      'last_name',
      'email',
      'roles',
    ];
    const student = await validateStudentEnrollment(TEST_LEARN_COHORT_ID, TEST_STUDENT.email);
    const actualProps = Object.keys(student);
    expect(actualProps).toEqual(expectedProps);
  });

  test('Should expect an error if student is not found in cohort', async () => {
    const status = await validateStudentEnrollment(TEST_LEARN_COHORT_ID, '***@test.com');
    expect(status).toBe('No active student found with provided email.');
  });

  test('Should expect an error if the cohortId provided is invalid', async () => {
    const status = await validateStudentEnrollment(0, TEST_STUDENT.email);
    expect(status).toBe('The requested resource could not be found');
  });
});

describe('validateStudentEnrollmentByID', () => {
  test('Should expect a student object if student is in cohort', async () => {
    const expectedProps = [
      'id',
      'uid',
      'first_name',
      'last_name',
      'email',
      'roles',
    ];
    const student = await validateStudentEnrollmentByID(TEST_LEARN_COHORT_ID, TEST_STUDENT.id);
    const actualProps = Object.keys(student);
    expect(actualProps).toEqual(expectedProps);
  });

  test('Should expect an error if student is not found in cohort', async () => {
    const status = await validateStudentEnrollmentByID(TEST_LEARN_COHORT_ID, 0);
    expect(status).toBe('No active student found with provided ID.');
  });

  test('Should expect an error if the cohortId provided is invalid', async () => {
    const status = await validateStudentEnrollmentByID(0, TEST_STUDENT.id);
    expect(status).toBe('The requested resource could not be found');
  });
});

describe('removeStudentFromCohort', () => {
  test('Should expect an ok status if successfully removed student from cohort', async () => {
    const status = await removeStudentFromCohort(TEST_LEARN_COHORT_ID, TEST_STUDENT.email);
    expect(status).toBe('ok');
  });

  test('Should expect an error if student is not found in cohort', async () => {
    const status = await removeStudentFromCohort(TEST_LEARN_COHORT_ID, TEST_STUDENT.email);
    expect(status).toBe('No active student found with provided email.');
  });

  test('Should expect an error if the cohortId provided is invalid', async () => {
    const status = await removeStudentFromCohort(0, TEST_STUDENT.email);
    expect(status).toBe('The requested resource could not be found');
  });
});

describe('removeStudentFromCohortByID', () => {
  test('Should expect an ok status if successfully removed student from cohort', async () => {
    await addStudent();
    const status = await removeStudentFromCohortByID(TEST_LEARN_COHORT_ID, TEST_STUDENT.id);
    expect(status).toBe('ok');
  });

  test('Should expect an error if student is not found in cohort', async () => {
    const status = await removeStudentFromCohortByID(TEST_LEARN_COHORT_ID, TEST_STUDENT.id);
    expect(status).toBe('No active student found with provided ID.');
  });

  test('Should expect an error if the cohortId provided is invalid', async () => {
    const status = await removeStudentFromCohortByID(0, TEST_STUDENT.id);
    expect(status).toBe('The requested resource could not be found');
  });
});

// TODO: Mock this test to not create a cohort in Learn Prod
// describe('createNewCohort', () => {
//   test('Should expect a 200 status if successfull', async () => {
//     const body = {
//       name: 'Paola Test Cohort (FROM API TEST)',
//       product_type: 'SEI Precourse',
//       label: '20-06-SEI-PRE',
//       campus_name: 'Remote',
//       starts_on: '2020-10-10',
//       ends_on: '2021-01-10',
//     };
//     const status = await createNewCohort(body);
//     expect(status).toBe(200);
//   });
//
//   test('Should return an error if the cohortId provided is invalid', async () => {
//     const students = await createNewCohort(0);
//     expect(students).toContain('Validation Error');
//   });
// });
