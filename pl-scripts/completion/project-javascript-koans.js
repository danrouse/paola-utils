/* global jasmine */
export default {
  repoName: 'javascript-koans',
  testRunnerFileName: 'KoansRunner.html',
  studentFilesToCopy: [
    'koans/AboutApplyingWhatWeHaveLearnt.js',
    'koans/AboutArrays.js',
    'koans/AboutExpects.js',
    'koans/AboutFunctions.js',
    'koans/AboutHigherOrderFunctions.js',
    'koans/AboutInheritance.js',
    'koans/AboutMutability.js',
    'koans/AboutObjects.js',
  ],
  repoCompletionColumnNames: ['koansMinReqs', 'javascriptKoans'],
  getTestResults: (page) =>
    page.evaluate(() => {
      return new Promise((resolve) => {
        function onComplete() {
          // eslint-disable-next-line no-underscore-dangle
          const suites = jasmine.currentEnv_.currentRunner_.suites();
          const requiredSuites = [
            'About Expects',
            'About Arrays',
            'About Functions',
            'About Objects',
          ];
          const passingSuites = suites.filter((suite) => suite.results().failedCount === 0).map((suite) => suite.description);
          const missingSuites = requiredSuites.filter((suiteName) => !passingSuites.includes(suiteName));
          const hasMinReqs = missingSuites.length === 0;
          const failureMessages = suites
            .filter((suite) => requiredSuites.includes(suite.description))
            .map((suite) => suite.specs_.filter((spec) => spec.results_.failedCount > 0))
            .flat()
            .map(spec => `**${spec.suite.description}**: *${spec.description}*: ` +
              `\`${spec.results_.items_.find(res => !res.passed_).message}\``);
          if (!hasMinReqs) {
            failureMessages.push(
              `The following required sections are not complete: ${missingSuites.join(', ')}`
            );
          }
          resolve({
            repoCompletionChanges: {
              koansMinReqs: hasMinReqs ? 'Yes' : 'No',
              javascriptKoans: suites.reduce(
                (sum, suite) =>
                  sum +
                  suite.specs().filter((spec) => spec.results_.failedCount === 0) // eslint-disable-line no-underscore-dangle
                    .length,
                0,
              ),
            },
            failureMessages: hasMinReqs ? [] : failureMessages,
          });
        }

        if (
          jasmine.currentEnv_.currentRunner_ // eslint-disable-line no-underscore-dangle
            .suites()
            .some((suite) => !suite.finished)
        ) {
          jasmine.currentEnv_.currentRunner_.finishCallback = onComplete; // eslint-disable-line no-underscore-dangle
        } else {
          onComplete();
        }
      });
    }),
};
