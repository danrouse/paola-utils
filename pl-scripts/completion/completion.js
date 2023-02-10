const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { CLIEngine } = require('eslint-legacy');
const executeInHeadlessBrowser = require('../../puppeteer');
const {
  loadGoogleSpreadsheet,
  getRows,
  updateWorksheet,
} = require('../../googleSheets');
const {
  cloneOrPullRepository,
  GIT_RETURN_CODE,
} = require('../../git/git-clone');
const { getFork } = require('../../github');
const { asyncTimeout, TimeoutError } = require('./async-timeout');

const TEST_TIME_LIMIT_MS = 30000;

const CELL_VALUE_NO_FORK = 'No Fork';
const CELL_VALUE_TIMEOUT = 'Timed Out';
const CELL_VALUE_ERROR = 'Error';

const GIT_RESPONSE_LOG_STRINGS = {
  [GIT_RETURN_CODE.REPO_CLONED]: 'Cloned remote repo',
  [GIT_RETURN_CODE.REPO_PULLED]: 'Updated local repo from remote',
  [GIT_RETURN_CODE.ERROR_REPO_PULL]: 'Error updating local repo, skipping',
  [GIT_RETURN_CODE.ERROR_REPO_CLONE]: 'Error cloning remote repo, skipping',
  [GIT_RETURN_CODE.REPO_NOT_FOUND]: 'Remote repo not found, skipping',
  [GIT_RETURN_CODE.REPO_NOT_CHANGED]: 'Remote repo unchanged, skipping',
};

const getTime = () => new Date().toLocaleTimeString('en-US', { hour12: false });

function getDefaultProjectValues(columnNames, value) {
  return columnNames.reduce(
    (obj, col) => ({ ...obj, [col]: value }),
    {},
  );
}

async function batchPromises(promiseGenerators, batchSize) {
  while (promiseGenerators.length) {
    await Promise.all(
      promiseGenerators.splice(0, batchSize || 1).map((g) => g()),
    );
  }
}

async function lintProject(projectPath) {
  // CLIEngine is deprecated now but we're pinning to 6.8.0
  const eslintCLI = new CLIEngine({
    cwd: projectPath,
    useEslintrc: false, // don't inherit paola-utils eslint config!
    configFile: path.join(projectPath, '.eslintrc.js'),
    parserOptions: {
      sourceType: 'script'
    }
  });
  const report = eslintCLI.executeOnFiles('.');
  return report.results.map((results) =>
    results.messages.map((message) =>
      `\`${results.filePath.replace(projectPath, '')}:${message.line}:${message.column}\`: \`${message.message}\``)).flat();
}

async function executeHTMLTestRunner(testRunnerPath, callback, showLogs) {
  if (!fs.existsSync(testRunnerPath)) {
    throw new Error(`Test runner does not exist: ${testRunnerPath}`);
  }
  return executeInHeadlessBrowser(async (page) => {
    let pageError;
    page.on('pageerror', (err) => { pageError = err; });

    await page.goto(`file://${testRunnerPath}`);
    const result = await asyncTimeout(callback(page), TEST_TIME_LIMIT_MS);
    if (result instanceof Error) throw result;
    result.error = pageError;
    return result;
  }, showLogs);
}

async function testProject({
  project,
  localRepoPath,
  verbose,
  logPrefix = '',
}) {
  let lintErrors, failureMessages, repoCompletionChanges, runtimeError;

  if (!project.skipLinting) {
    console.info(getTime(), logPrefix, 'Running linter on project...');
    try {
      lintErrors = await lintProject(localRepoPath);
    } catch (err) {
      // error thrown by eslint
      console.log('ESLint error:');
      console.log(err);
      lintErrors = [
        'An error occurred when linting your code. Make sure you have not changed any of the linter settings!',
        'These settings are not made to be modified.',
      ];
    }
  }

  console.info(getTime(), logPrefix, 'Executing test runner...');
  try {
    let testRunnerResults = {};
    if (project.testRunnerFileName) {
      // Preferentially use an HTML testRunnerFileName in conjunction with
      // a getTestResults function that runs on the page
      testRunnerResults = await executeHTMLTestRunner(
        path.join(localRepoPath, project.testRunnerFileName),
        project.getTestResults,
        verbose,
      );
    } else if (project.runTests) {
      // If there's no HTML test runner, use a supplied runTests function
      testRunnerResults = await project.runTests(localRepoPath);
    }
    failureMessages = testRunnerResults.failureMessages;
    repoCompletionChanges = testRunnerResults.repoCompletionChanges;
    runtimeError = testRunnerResults.error;
  } catch (err) {
    if (verbose) console.error(err);
    const cellValue = {
      value:
        err instanceof TimeoutError ? CELL_VALUE_TIMEOUT : CELL_VALUE_ERROR,
      note: `${err.name}: ${err.message}`,
    };
    repoCompletionChanges = getDefaultProjectValues(project.repoCompletionColumnNames, cellValue);
    runtimeError = err;
  }

  return {
    lintErrors, failureMessages, repoCompletionChanges, runtimeError
  };
}

async function fetchAndTestProject({
  githubHandle,
  project,
  cohortId,
  verbose,
  lastCommitHash,
  localPathToStudentRepos,
  githubAuthUser,
  githubAuthToken,
}) {
  const logPrefix = `[${githubHandle} - ${project.repoName}]:`;
  const qualifiedRepoName = `${cohortId}-${project.repoName}`;
  const localRepoPath = path.resolve(
    localPathToStudentRepos,
    githubHandle,
    qualifiedRepoName,
  );
  const forkName = await getFork(qualifiedRepoName, githubHandle);
  const githubPath = `${githubHandle}/${forkName}.git`;
  const gitResult = await cloneOrPullRepository(
    localRepoPath,
    githubPath,
    lastCommitHash,
    githubAuthUser,
    githubAuthToken,
  );
  console.info(getTime(), logPrefix, GIT_RESPONSE_LOG_STRINGS[gitResult.code]);

  let lintErrors, failureMessages, repoCompletionChanges, runtimeError;
  if (
    gitResult.code === GIT_RETURN_CODE.REPO_CLONED ||
    gitResult.code === GIT_RETURN_CODE.REPO_PULLED
  ) {
    let pathToTest = localRepoPath;
    if (project.studentFilesToCopy) {
      // clone base repo
      const baseRepoPath = path.resolve(localPathToStudentRepos, 'hackreactor', qualifiedRepoName);
      await cloneOrPullRepository(
        baseRepoPath,
        `hackreactor/${qualifiedRepoName}.git`,
        null,
        githubAuthUser,
        githubAuthToken,
      );

      // copy student files onto base repo
      project.studentFilesToCopy.forEach((fileName) =>
        fs.copyFileSync(
          path.join(localRepoPath, fileName),
          path.join(baseRepoPath, fileName),
        ));

      pathToTest = baseRepoPath;
    }

    const result = await testProject({
      project, localRepoPath: pathToTest, verbose, logPrefix
    });

    if (project.studentFilesToCopy) {
      // reset base repo
      execSync(`cd ${pathToTest} && git reset --hard master`);
    }

    lintErrors = result.lintErrors;
    failureMessages = result.failureMessages;
    repoCompletionChanges = result.repoCompletionChanges;
    runtimeError = result.runtimeError;
  } else if (gitResult.code === GIT_RETURN_CODE.REPO_NOT_FOUND) {
    repoCompletionChanges = getDefaultProjectValues(project.repoCompletionColumnNames, CELL_VALUE_NO_FORK);
  }

  return {
    gitCommitHash: gitResult.hash,
    lintErrors: lintErrors || [],
    runtimeError,
    repoCompletionChanges: repoCompletionChanges || {},
    failureMessages,
  };
}

async function updateRepoCompletionWorksheet({
  sheetId,
  sheetName,
  projects,
  techMentorName,
  batchSize,
  cohortId,
  localPathToStudentRepos,
  githubAuthUser,
  githubAuthToken,
  verbose,
}) {
  const sheet = await loadGoogleSpreadsheet(sheetId);
  const worksheet = sheet.sheetsByTitle[sheetName];
  if (!sheet) return false;

  const repoCompletionWorksheetRows = await worksheet.getRows();

  // Parse JSON from student metadata worksheet
  const studentMetadataWorksheet = sheet.sheetsByTitle['PAOLA Repo Completion Cache'];
  const studentMetadataWorksheetRows = await studentMetadataWorksheet.getRows();
  const studentMetadata = studentMetadataWorksheetRows.reduce(
    (acc, cur) => ({
      ...acc,
      [cur.githubHandle]: JSON.parse(cur.json),
    }),
    {},
  );

  // Combine data from repo completion and metadata sheets
  const rawStudents = (await getRows(worksheet)).filter(
    (row) => row.githubHandle && (!techMentorName || row.techMentor === techMentorName),
  );
  const students = rawStudents.map((student) => ({
    ...student,
    metadata: studentMetadata[student.githubHandle] || {},
  }));

  // Defer creation of promises so execution doesn't begin immediately, for batching
  const promiseGenerators = students.map((student) => async () => {
    const studentResults = { githubHandle: student.githubHandle };
    await Promise.all(
      projects.map(async (project) => {
        const results = await fetchAndTestProject({
          githubHandle: student.githubHandle,
          project,
          cohortId,
          verbose,
          lastCommitHash: student.metadata[`${project.repoName}LastCommit`],
          localPathToStudentRepos,
          githubAuthUser,
          githubAuthToken,
        });
        Object.assign(studentResults, results.repoCompletionChanges);
        student.metadata[`${project.repoName}LastCommit`] = results.gitCommitHash; // eslint-disable-line no-param-reassign
      }),
    );
    // Update repo completion sheet
    await updateWorksheet(
      worksheet,
      'githubHandle',
      studentResults,
      repoCompletionWorksheetRows,
    );
    // Update student metadata sheet with tested commit hashes
    await updateWorksheet(
      studentMetadataWorksheet,
      'githubHandle',
      {
        githubHandle: student.githubHandle,
        json: JSON.stringify(student.metadata),
      },
      studentMetadataWorksheetRows,
    );
  });

  await batchPromises(promiseGenerators, batchSize || 1);

  return true;
}

async function updateRepoCompletionWorksheets({
  sheetId,
  sheetNames,
  projects,
  batchSize,
  cohortId,
  localPathToStudentRepos,
  githubAuthUser,
  githubAuthToken,
  verbose,
}) {
  for (const sheetName of sheetNames) {
    try {
      const result = await updateRepoCompletionWorksheet({
        sheetId,
        sheetName,
        projects,
        batchSize,
        cohortId,
        localPathToStudentRepos,
        githubAuthUser,
        githubAuthToken,
        verbose,
      });
      if (!result) {
        console.info(
          getTime(),
          `Google Sheet or Worksheet name not found, skipping: ${sheetName}`,
        );
      }
    } catch (err) {
      console.error(
        'Unexpected error when assessing repo completion, skipping:',
      );
      console.error(`sheetId: ${sheetId}, sheetName: ${sheetName}`);
      console.error(err);
      process.exit(1);
    }
  }
}

module.exports = {
  testProject,
  fetchAndTestProject,
  updateRepoCompletionWorksheets,
};
