const cypress = require('cypress');
const path = require('path');

module.exports = {
  repoName: 'twiddler',
  repoCompletionColumnNames: ['twiddler'],
  skipLinting: true,
  runTests: (repoPath) => {
    const strippedPath = repoPath.replace(process.cwd(), '');
    return cypress
      .run({
        config: {
          defaultCommandTimeout: 100,
          fixturesFolder: false,
          integrationFolder: path.resolve(__dirname, 'twiddler-cypress-tests'),
          pluginsFile: false,
          supportFile: false,
          screenshotOnRunFailure: false,
          video: false,
          numTestsKeptInMemory: 0,
          watchForFileChanges: false,
        },
        configFile: false,
        quiet: true,
        reporter: path.resolve(__dirname, 'twiddler-cypress-dummy-reporter.js'),
        env: {
          INDEX_PATH: `${strippedPath}/index.html`,
          ALL_TESTS: true,
        },
      })
      .then((results) => {
        const ignoredTests = [
          'the page is as beautiful as you want it to be',
        ];
        const failedTests = results.runs[0].tests.filter((test) =>
          test.state === 'failed' &&
          test.title[0] !== 'Extra credit' &&
          !ignoredTests.includes(test.title[test.title.length - 1]));
        if (
          failedTests[0] && failedTests[0].displayError && failedTests[0].displayError.startsWith(
            'TypeError: The following error originated from your application code, not from Cypress.'
          )
        ) {
          const runtimeErrorLines = failedTests[0].displayError.match(/\s+> (.+)/g);
          throw new Error(
            runtimeErrorLines.map((line) => line.replace(/^\s+> /, '')).join('\n')
          );
        }
        return {
          repoCompletionChanges: {
            twiddler: results.totalPassed,
          },
          failureMessages: failedTests.map((test) => `**${test.title[0]}**: ${test.title.length === 2 ? test.title[1] : `*${test.title[1]}*: ${test.title.slice(2).join(': ')}`}`),
        };
      });
  },
};
