/* global mocha */
module.exports = {
  repoName: 'underbar',
  testRunnerFileName: 'SpecRunner.html',
  studentFilesToCopy: ['src/underbar.js'],
  repoCompletionColumnNames: ['underbarPartOne', 'underbarPartTwo'],
  getTestResults: (page) =>
    page.evaluate(() => new Promise((resolve) => {
      function onComplete() {
        const passedTestCount = mocha.suite.suites.map((section) => section.suites
          .map(
            (subsection) =>
              subsection.tests.filter((t) => t.state === 'passed').length,
          )
          .reduce((sum, cur) => sum + cur, 0));
        const getFailedTestNames = (suite) =>
          suite.suites.map((nested) => nested.tests).flat()
            .filter((t) => t.state === 'failed')
            .map((test) => `**${test.parent.parent.title}**: *${test.parent.title}*: \`${test.title}\`: \`${test.err.message}\``);
        const partOneFailures = getFailedTestNames(mocha.suite.suites[0]);
        const partTwoFailures = getFailedTestNames(mocha.suite.suites[1]);
        // const partExtraFailures = getFailedTestNames(mocha.suite.suites[2]);
        resolve({
          repoCompletionChanges: {
            underbarPartOne: passedTestCount[0],
            underbarPartTwo: passedTestCount[1],
            // underbarExtra: passedTestCount[2],
          },
          failureMessages: [].concat(partOneFailures, partTwoFailures),
        });
      }
      const testResults = [].concat(
        mocha.suite.suites[0].suites.map((nested) => nested.tests).flat().map((test) => test.state),
        mocha.suite.suites[1].suites.map((nested) => nested.tests).flat().map((test) => test.state),
      );
      if (testResults.every((state) => state === 'passed' || state === 'failed')) {
        onComplete();
      } else {
        mocha.suite.afterAll(() => onComplete());
      }
    })),
};
