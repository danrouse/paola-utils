/* eslint-env browser */
/* global mocha */
const MESSAGE_FINAL_STEP_READY = 'STEP FOUR:';
const MESSAGE_SUITE_COMPLETED =
  'Congratulations! You have finished the exercise!';
const APPEND_TO_TEST_COUNT_ON_INCOMPLETE = ' ❌';

module.exports = {
  repoName: 'testbuilder',
  testRunnerFileName: 'index.html',
  studentFilesToCopy: [
    'detectNetwork.js',
    'detectNetwork.test.js',
  ],
  repoCompletionColumnNames: ['testbuilder'],
  getTestResults: async (page) => {
    let hasCompletedMessage = false;
    let lastLogLine = '';
    page.on('console', (event) => {
      lastLogLine = event.text();
      if (event.text() === MESSAGE_SUITE_COMPLETED) {
        hasCompletedMessage = true;
      } else if (event.text().startsWith(MESSAGE_FINAL_STEP_READY)) {
        page.evaluate(() => window.nextStep());
      }
    });

    const getErrorMessage = () => [
      'The test runner did not make it to the final completion message! ' +
      `The last message logged was:\n\`\`\`\n${
        lastLogLine.replace(/%c/g, '').replace(/\s+font-weight.+$/, '')
      }\n\`\`\``,
    ];

    await page.evaluate(() => {
      window.detectNetwork('38345678901234');
      window.detectNetwork('39345678901234');
      window.detectNetwork('343456789012345');
      window.detectNetwork('373456789012345');
      window.nextStep();
      window.detectNetwork('4123456789012');
      window.detectNetwork('4123456789012345');
      window.detectNetwork('4123456789012345678');
      window.detectNetwork('5112345678901234');
      window.detectNetwork('5212345678901234');
      window.detectNetwork('5312345678901234');
      window.detectNetwork('5412345678901234');
      window.detectNetwork('5512345678901234');
      window.nextStep();
      window.nextStep();
      window.nextStep();
    });

    // Bail out if suite isn't running
    if (!(await page.evaluate(() => document.querySelector('.passes')))) {
      return {
        repoCompletionChanges: {
          testbuilder: 0,
        },
        failureMessages: getErrorMessage(),
      };
    }

    // Explicitly wait for the number of test results to match the number of defined tests
    await page.waitForFunction(() => {
      function countTests(suites) {
        return suites.reduce(
          (acc, suite) => acc + suite.tests.length + countTests(suite.suites),
          0,
        );
      }
      const definedTests = countTests(mocha.suite.suites) + mocha.suite.tests.length;
      const executedTests =
        Number(document.querySelector('.passes em').innerText) +
        Number(document.querySelector('.failures em').innerText);
      return executedTests >= definedTests;
    });

    let testsPassing =
      Number(
        await page.$$eval(
          '.passes',
          (passes) => passes[0].children[1].innerText,
        ),
      ) || 0;
    if (!hasCompletedMessage) {
      testsPassing += APPEND_TO_TEST_COUNT_ON_INCOMPLETE;
    }

    return {
      repoCompletionChanges: {
        testbuilder: testsPassing,
      },
      failureMessages: hasCompletedMessage ? [] : getErrorMessage(),
    };
  },
};
