require('dotenv').config();
const Bottleneck = require('bottleneck');
const { createTeam, addUsersToTeam } = require('../github');
const { createNewCohort, addStudentToCohort, updateCohortContent } = require('../learn');
const { loadGoogleSpreadsheet, getRows } = require('../googleSheets');
const { DOC_ID_CESP, SHEET_ID_CESP_ROSTER } = require('../constants');

const DO_IT_LIVE = false;

const LEARN_COHORT_FT_START_DATE = '2022-12-12'; // direct from product cal
const LEARN_COHORT_FT_END_DATE = '2023-03-27'; // start date of round after NEXT
const LEARN_COHORT_PRECOURSE_START_DATE = '2022-12-12'; // direct from product cal
const LEARN_COHORT_PRECOURSE_END_DATE = '2023-02-06'; // start date of next round

const CONFIG = [{
  teamName: 'Students: RFP2212',
  learnCampusName: 'Remote Pacific',
  learnCohortName: 'SEI-RFP2212',
  learnCohortLabel: '22-12-SEI-RFP',
  learnCohortStartDate: LEARN_COHORT_FT_START_DATE,
  learnCohortEndDate: LEARN_COHORT_FT_END_DATE,
  learnContentConfig: 'https://github.com/gSchool/learn-course-files/blob/master/SE/SEI/hrr.yaml',
  precourseCampusName: 'RFT Pacific',
  staff: [{
    firstName: 'Yu-Lin', lastName: 'Kong', email: 'yulin.kong@galvanize.com', github: 'yu-linkong1',
  }, {
    firstName: 'Eric', lastName: 'Do', email: 'eric.do@galvanize.com', github: 'eric-do',
  }, {
    firstName: 'Hilary', lastName: 'Upton', email: 'hilary.upton@galvanize.com', github: 'hilaryupton13',
  }, {
    firstName: 'Julian', lastName: 'Yuen', email: 'julian.yuen@galvanize.com', github: 'jyuen',
  }, {
    firstName: 'Katie', lastName: 'Papke', email: 'katie.papke@galvanize.com', github: 'Katie-Papke',
  }, {
    firstName: 'Mylani', lastName: 'Demas', email: 'mylani.demas@galvanize.com', github: 'mylanidemas1',
  }, {
    firstName: 'Natalie', lastName: 'Massarany', email: 'natalie.massarany@galvanize.com',
  }, {
    firstName: 'Kevin', lastName: 'Goble', email: 'kevin.goble@galvanize.com', github: 'Gobleizer',
  }, {
    firstName: 'Gauri', lastName: 'Iyer', email: 'gauri.iyer@galvanize.com', github: 'iyergauri',
  },
  // SEIRs
  {
    firstName: 'Gracie', lastName: 'Fogarty', github: 'GracieFogarty', email: 'graciealysse@gmail.com',
  }, {
    firstName: 'Darryl', lastName: 'Grier', github: 'darryl-dg', email: 'darrylgrierjr@gmail.com',
  }, {
    firstName: 'Ivan', lastName: 'Luk', github: 'theivanluk', email: 'luk.ivan.mech@gmail.com',
  }, {
    firstName: 'Amberly', lastName: 'Malone', github: 'amberlyM', email: 'amberm1205@gmail.com',
  }, {
    firstName: 'Kathryn', lastName: 'Gao', github: 'katto030', email: 'kathryn.kuroko@gmail.com',
  }, {
    firstName: 'Jaden', lastName: 'Ee', github: 'jadennnnnnn', email: 'jadenjee@gmail.com',
  }, {
    firstName: 'Jonah', lastName: 'Choi', github: 'jonahchoi', email: 'cjonah227@gmail.com',
  }, {
    firstName: 'Josh', lastName: 'Garza', github: 'joshgarza', email: 'josh@sf-iron.com',
  }, {
    firstName: 'Kally', lastName: 'Cao', github: 'kallycao', email: 'kallycao98@gmail.com',
  }, {
    firstName: 'Sean', lastName: 'McEntagart', github: 'sean-mcodes', email: 'seanmcentagart45@gmail.com',
  }, {
    firstName: 'Sophia', lastName: 'Zhou', github: 'sbagel', email: 'tosophiazhou@gmail.com',
  }],
}, {
  teamName: 'Students: RFE2212',
  learnCampusName: 'Remote Eastern',
  learnCohortName: 'SEI-RFE2212',
  learnCohortLabel: '22-12-SEI-RFE',
  learnCohortStartDate: LEARN_COHORT_FT_START_DATE,
  learnCohortEndDate: LEARN_COHORT_FT_END_DATE,
  learnContentConfig: 'https://github.com/gSchool/learn-course-files/blob/master/SE/SEI/sei12.yaml',
  precourseCampusName: 'RFT Eastern',
  staff: [{
    firstName: 'Zabrian', lastName: 'Oglesby', email: 'zabrian.oglesby@galvanize.com', github: 'ZabrianOglesby',
  }, {
    firstName: 'Jolisha', lastName: 'Young', email: 'jolisha.young@galvanize.com',
  }, {
    firstName: 'Jake', lastName: 'Ascher', email: 'jake.ascher@galvanize.com', github: 'ascherj',
  }, {
    firstName: 'Shelecia', lastName: 'McKinney', email: 'shelecia.mckinney@galvanize.com', github: 'SheleciaM',
  }, {
    firstName: 'Sunnie', lastName: 'Frazier', email: 'francine.frazier@galvanize.com',
  }, {
    firstName: 'Tosi', lastName: 'Awofeso', email: 'tosin.awofeso@galvanize.com',
  }, {
    firstName: 'Esti', lastName: 'Gajda', email: 'esti.gajda@galvanize.com',
  },
  // SEIRs
  {
    firstName: 'Michael', lastName: 'Raisch', github: 'LikeMike07',
  }],
}, {
  teamName: 'Students: SEIP2302',
  learnCampusName: 'Precourse',
  learnCohortName: 'SEI - Precourse - February 2023',
  learnCohortLabel: null,
  learnCohortStartDate: LEARN_COHORT_PRECOURSE_START_DATE,
  learnCohortEndDate: LEARN_COHORT_PRECOURSE_END_DATE,
  learnCohortIsPrep: true,
  learnContentConfig: 'https://github.com/gSchool/learn-course-files/blob/master/SE/SEI/SEIP.yaml',
  staff: [{
    firstName: 'Beverly', lastName: 'Hernandez', email: 'beverly.hernandez@galvanize.com', github: 'beverlyAH',
  }, {
    firstName: 'Daniel', lastName: 'Rouse', email: 'daniel.rouse@galvanize.com', github: 'danrouse',
  }, {
    firstName: 'David', lastName: 'Coleman', email: 'david.coleman@galvanize.com', github: 'colemandavid55',
  }, {
    firstName: 'Eliza', lastName: 'Drinker', email: 'eliza.drinker@galvanize.com', github: 'aesuan',
  }, {
    firstName: 'Steven', lastName: 'Chung', email: 'steven.chung@galvanize.com', github: 'stevenchung213',
  }],
}];

// map of learnCohortName to UID
// populated when cohorts are created
// if doing a late-run, or student population, set these manually!
// the UIDs of newly-created cohorts are logged at creation-time
const cohortIds = {
  'SEI-RFP2209': 'd2b43b937e89b8df0f',
  'SEI-RFC2209': '4a217bdd03e841ab63',
  'SEI-RFE2209': '0e6d1716b3da33e2a3',
  'SEI-RPP2209': '5e5eae966ce77ee647',
  'SEI - Precourse - October 2022': '943c2358b9423dcf8c',
};

// END OF CONFIGURATION

const learnRateLimiter = new Bottleneck({
  maxConcurrent: 2,
  minTime: 500,
});
const addStudentToCohortRL = learnRateLimiter.wrap(addStudentToCohort);

const formatGitHubTeamNameAsSlug = (teamName) => teamName.replace(/:/g, '').replace(/\s+/g, '-');

const createGitHubTeams = () => Promise.all(
  CONFIG.map((config) => {
    console.log('Create GitHub team', config.teamName);
    if (!DO_IT_LIVE) return true;
    return createTeam(config.teamName);
  }),
);

const addInstructorsToGitHubTeams = () => Promise.all(
  CONFIG.map((config) => {
    const usernames = config.staff.filter((s) => s.github).map((s) => s.github);
    console.log(`Adding staff to GitHub Team ${formatGitHubTeamNameAsSlug(config.teamName)}: ${usernames}...`);
    if (!DO_IT_LIVE) return true;
    return addUsersToTeam(usernames, formatGitHubTeamNameAsSlug(config.teamName), true);
  }),
);

const createLearnCohorts = () => Promise.all(
  CONFIG.map(async (config) => {
    const cohort = {
      name: config.learnCohortName,
      product_type: 'SEI',
      label: config.learnCohortLabel,
      campus_name: config.learnCampusName,
      starts_on: config.learnCohortStartDate,
      ends_on: config.learnCohortEndDate,
      program: 'Consumer',
      subject: 'Software Engineering',
      cohort_format: 'Full Time',
      category: config.learnCohortIsPrep ? 'Prep' : 'Immersive',
    };
    console.log('Create Learn cohort', cohort);
    if (DO_IT_LIVE) {
      const cohortId = await createNewCohort(cohort);
      cohortIds[config.learnCohortName] = cohortId;
      console.log(`Created Learn cohort ${config.learnCohortName} with UID ${cohortId}`);
      const resyncResponse = await updateCohortContent(cohortId, config.learnContentConfig);
      console.log(`Resynced new cohort with config URL ${config.learnContentConfig} (Response: ${resyncResponse ? 'OK' : 'Error!'})`);
    }
  }),
);

const addInstructorsToLearnCohorts = () => Promise.all(
  CONFIG.map(async (config) => {
    const learnCohortId = cohortIds[config.learnCohortName];
    if (!learnCohortId) {
      console.info(`No cohort ID found for cohort "${config.learnCohortName}", skipping...`);
      return;
    }
    for (const { firstName, lastName, email } of config.staff) {
      const staff = {
        first_name: firstName,
        last_name: lastName,
        email,
        instructor: true,
      };
      console.log('Create staff', config.learnCohortName, learnCohortId, staff);
      if (DO_IT_LIVE) {
        await addStudentToCohortRL(learnCohortId, staff);
      }
    }
  }),
);

const getStudentsToOnboard = async () => {
  const cespSheet = await loadGoogleSpreadsheet(DOC_ID_CESP);
  const students = await getRows(cespSheet.sheetsById[SHEET_ID_CESP_ROSTER]);
  const eligibleStudents = students.filter((student) => student['Precourse Complete'] === 'Yes' && student.Status === 'Enrolled');
  console.log('eligible students', eligibleStudents.length, 'of', students.length);
  return eligibleStudents.map((student) => ({
    fullName: student['Full Name'],
    campus: student.Campus,
    githubHandle: student.GitHub,
    email: student['SFDC Email'],
  }));
};

const addStudentsToGitHubTeams = async (students) => {
  const cohortConfigs = CONFIG.filter((config) => !config.learnCohortIsPrep);
  for (const config of cohortConfigs) {
    const campusStudents = students.filter((student) => config.precourseCampusName === student.campus);
    if (!campusStudents.length) {
      console.log(`Cannot find matching CES&P campus for config campus named "${config.precourseCampusName}", skipping!`);
      return null;
    }
    const campusName = formatGitHubTeamNameAsSlug(config.teamName);
    console.log('Add', campusStudents.length, 'students to team', campusName);
    console.log(campusStudents.map((student) => student.githubHandle));
    if (!DO_IT_LIVE) continue;
    await addUsersToTeam(campusStudents.map((student) => student.githubHandle), campusName);
  }
  return true;
};

const addStudentsToLearnCohorts = async (students) => {
  const studentsWithValidCampus = students.filter((student) => CONFIG.find((config) => config.precourseCampusName === student.campus));
  for (const student of studentsWithValidCampus) {
    const campusConfig = CONFIG.find((config) => config.precourseCampusName === student.campus);
    if (!campusConfig) {
      console.log(`Cannot find matching config campus for student "${student.fullName}" with CES&P campus "${student.campus}", skipping!`);
      return null;
    }
    const learnCohortId = cohortIds[campusConfig.learnCohortName];
    const splitName = student.fullName.split(' ');
    const learnStudent = {
      first_name: splitName[0],
      last_name: splitName[splitName.length - 1],
      email: student.email,
    };
    console.log('Add student from Precourse', student.campus, 'to', campusConfig.learnCampusName, learnCohortId, JSON.stringify(learnStudent));
    if (!DO_IT_LIVE) continue;
    await addStudentToCohortRL(learnCohortId, learnStudent);
  }
  return true;
};

// eslint-disable-next-line no-unused-vars
const initializeNewCohorts = async () => {
  console.log('Creating GitHub teams...');
  const gitHubTeamResult = await createGitHubTeams();
  console.log(gitHubTeamResult);

  console.log('Creating Learn cohorts...');
  const learnCohortResult = await createLearnCohorts();
  console.log(learnCohortResult);
};

// eslint-disable-next-line no-unused-vars
const populateNewCohortsWithStaff = async () => {
  console.log('Adding instructors to GitHub teams...');
  const addInstructorsToGitHubResult = await addInstructorsToGitHubTeams();
  console.log(addInstructorsToGitHubResult);

  console.log('Adding instructors to Learn cohorts...');
  const addInstructorsToLearnResult = await addInstructorsToLearnCohorts();
  console.log(addInstructorsToLearnResult);
};

// eslint-disable-next-line no-unused-vars
const populateNewCohortsWithStudents = async () => {
  console.log('Getting students from roster...');
  const students = await getStudentsToOnboard();
  console.log(`Got ${students.length} students!`);

  console.log('Adding students to GitHub teams...');
  const addStudentsToGitHubResult = await addStudentsToGitHubTeams(students);
  console.log(addStudentsToGitHubResult);

  console.log('Adding students to Learn cohorts...');
  const addStudentsToLearnResult = await addStudentsToLearnCohorts(students);
  console.log(addStudentsToLearnResult);
};

const printURLs = () => {
  console.log('*New cohorts have been created!* 🎉\n');
  console.log(
    CONFIG.map((config) => [
      `*${config.learnCampusName} (${config.learnCohortName})*`,
      `_GitHub_: https://github.com/orgs/hackreactor/teams/${formatGitHubTeamNameAsSlug(config.teamName)}/members`,
      `_Learn_: https://learn-2.galvanize.com/cohorts/${cohortIds[config.learnCohortName]}/users`,
      '',
    ].join('\n')).join('\n'),
  );
};

(async () => {
  await initializeNewCohorts();
  await populateNewCohortsWithStaff();
  // await populateNewCohortsWithStudents();
  printURLs();
})();
