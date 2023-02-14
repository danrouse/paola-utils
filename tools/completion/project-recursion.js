/* global mocha */
module.exports = {
  repoName: 'recursion',
  testRunnerFileName: 'SpecRunner.html',
  studentFilesToCopy: [
    'src/getElementsByClassName.js',
    'src/parseJSON.js',
    'src/stringifyJSON.js',
  ],
  repoCompletionColumnNames: ['recursion'],
  getTestResults: (page) => page.evaluate(() => new Promise((resolve) => {
    function onComplete() {
      resolve({
        repoCompletionChanges: {
          recursion: mocha.suite.suites.filter((suite) =>
            (suite.suites.length > 0
              ? suite.suites.every((s) => s.tests.every((t) => t.state === 'passed'))
              : suite.tests.every((t) => t.state === 'passed'))).length,
        },
        failureMessages: mocha.suite.suites.slice(0, 2).map((suite) =>
          suite.suites.map((nested) => nested.tests).flat().concat(suite.tests)
            .filter((t) => t.state === 'failed')
            .map((test) => `**${test.parent.parent.title}**: *${test.parent.title}*: \`${test.title}\`: \`${test.err.message}\``)).flat()
      });
    }
    // eslint-disable-next-line no-underscore-dangle
    if (mocha._state === 'init' || mocha._state === 'running') {
      mocha.suite.afterAll(() => onComplete());
    } else {
      onComplete();
    }
  })),
};
