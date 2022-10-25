require('dotenv').config();
const yargs = require('yargs');
const path = require('path');
const {
  updateRepoCompletionWorksheets,
  fetchAndTestProject,
} = require('./completion');
const projectDefinitions = require('./project-definitions');
const techMentors = require('../../tech-mentors');
const {
  COHORT_ID,
  DOC_ID_PULSE,
} = require('../../constants');

// TODO: allow passing in a path to student repos?
const PATH_TO_STUDENT_REPOS = path.resolve(__dirname, '../../student-repos');

const { argv } = yargs(process.argv)
  .option('tech-mentors', {
    alias: 'tm',
    describe: 'tech mentor first name(s) (leave blank for all)',
    type: 'array',
    default: techMentors.map((tm) => tm.name.toLowerCase()),
    choices: techMentors.map((tm) => tm.name.toLowerCase()),
  })
  .option('projects', {
    alias: 'p',
    describe: 'projects to assess completion for (leave blank for all)',
    type: 'array',
    default: Object.keys(projectDefinitions),
    choices: Object.keys(projectDefinitions),
  })
  .option('batch-size', {
    alias: 'b',
    describe: 'number of students to process concurrently',
    type: 'number',
    default: 1,
  })
  .option('student', {
    describe:
      'GitHub handle of a single student to test (will NOT update spreadsheet!)',
  })
  .option('verbose', {
    alias: 'v',
    describe: 'Show console output from within test runners',
    type: 'boolean',
    default: false,
  });

if (argv.student) {
  // --student option passed, run against single student without updating sheet
  (async () => {
    // eslint-disable-next-line no-restricted-syntax
    for (const projectName of argv.projects) {
      const project = projectDefinitions[projectName];
      try {
        // eslint-disable-next-line no-await-in-loop
        const results = await fetchAndTestProject({
          githubHandle: argv.student,
          project,
          cohortId: COHORT_ID,
          localPathToStudentRepos: PATH_TO_STUDENT_REPOS,
          githubAuthUser: process.env.GITHUB_AUTH_USER,
          githubAuthToken: process.env.GITHUB_AUTH_TOKEN,
          verbose: argv.verbose,
        });
        console.log(`[${argv.student} - ${project.repoName}]:`, results);
      } catch (err) {
        if (argv.verbose) console.error(err);
        console.log(`[${argv.student} - ${project.repoName}]: Error`);
        console.log(err);
      }
    }
  })();
} else {
  const worksheetNames = argv['tech-mentors'].map((name) => techMentors.find((tm) => tm.name.toLowerCase() === name).repoCompletionSheetName);
  updateRepoCompletionWorksheets({
    sheetId: DOC_ID_PULSE,
    sheetNames: worksheetNames,
    projects: argv.projects.map((name) => projectDefinitions[name]),
    batchSize: argv['batch-size'],
    cohortId: COHORT_ID,
    localPathToStudentRepos: PATH_TO_STUDENT_REPOS,
    githubAuthUser: process.env.GITHUB_AUTH_USER,
    githubAuthToken: process.env.GITHUB_AUTH_TOKEN,
    verbose: argv.verbose,
  });
}
