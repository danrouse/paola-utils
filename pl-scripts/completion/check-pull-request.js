import { testProject } from './completion';
import projectDefinitions from './project-definitions';

const projectName = process.argv[2];
const projectPath = process.argv[3];
console.log('check-pull-request called with args:');
console.log(projectName, projectPath);

if (!projectDefinitions[projectName]) {
  console.log(`unknown project name: ${projectName}, exiting`);
  process.exit(1);
}

console.log('env:');
console.log(process.env);


(async () => {
  const result = await testProject({
    project: projectDefinitions[projectName],
    localRepoPath: projectPath,
    verbose: true,
  });
  const message = generateResultsMessage(result, projectName);
  console.log(result);
  console.log(message);
  // if (result.gitCommitHash) {
  //   if (result.runtimeError && result.runtimeError.message && (
  //     result.runtimeError.message.includes('Cypress') ||
  //     result.runtimeError.message.includes('puppeteer')
  //   )) {
  //     if (numAttempts === 3) {
  //       log('Error from test runner, quitting after 3 failed attempts!');
  //     } else {
  //       log(`Error from test runner, retrying! (attempt ${numAttempts})`);
  //     }
  //     continue;
  //   }
  //   const message = generateResultsMessage(result, projectName);
  //   log('Posting message:', message);

  //   // post message to Pull Request via GitHub issue comments API
  //   const endpoint = issueURL.replace('https://api.github.com/', '') + '/comments';
  //   const githubResponse = await gitHubAPIRequest(endpoint, 'POST', { body: message });
  //   if (githubResponse.message) {
  //     log('Error posting message to GitHub:', githubResponse.message);
  //   } else {
  //     log('Posted message to Pull Request #', pullRequestNumber);
  //   }
  // } else {
  //   log('Error cloning repository from GitHub! Quitting...');
  // }
  // return;
})();

