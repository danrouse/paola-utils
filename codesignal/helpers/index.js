const fetch = require('node-fetch');
const fs = require('fs');

/*
  CODESIGNAL_API_KEY must be set in env for this file to function!
  */

/*
  convertEpochTime by default converts epoch time to a human-readable Pacific timezone timestamp

  Optional input: timezoneOffset (default to PST: -8)
    - pass in a timezone offset if you'd like to convert to a different timezone
 */

const convertEpochTime = (epochTime, timezoneOffset = -8) => {
  const date = new Date(epochTime);
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const newDate = new Date(utc + (3600000 * timezoneOffset));
  return newDate.toLocaleString();
};

// helper to 'humanize' epoch times
const convertMStoMinutes = (epochTime) => (Number.isNaN(epochTime) ? 0
  : Math.round(Number(((epochTime / 1000) / 60).toFixed(1))));

const mod2nullResultObject = {
  score: 'did not attempt',
  solvedTaskCount: 'did not attempt',
  taskResults: [
    {
      sessionTask: {
        task: {
          title: 'PrecourseRobotValueTracker',
          maxScore: 300
        }
      },
      labels: [
        'SEIP-2204',
        'Precourse'
      ],
      score: 'did not attempt',
      replayUrl: 'na',
      solveTime: 'did not attempt',
      timeSpent: 'did not attempt'
    },
    {
      sessionTask: {
        task: {
          title: 'PrecourseRobotValueHOF',
          maxScore: 300
        }
      },
      labels: [
        'SEIP-2204',
        'Precourse'
      ],
      score: 'did not attempt',
      replayUrl: 'na',
      solveTime: 'did not attempt',
      timeSpent: 'did not attempt'
    }
  ],
  url: 'na'
};

// helper to format nested objects within the results
const formatResultObject = (obj, studentEmails) => {
  // console.log('KJSDHKJFSDHSDF: ', studentEmails);
  const {
    startDate,
    finishDate,
    status,
    testTaker: { email, firstName, lastName },
    result,
    labels = [],
  } = obj;

  // handling the destructuring of null if student's result value is null => 'did not attempt' cases
  const {
    score: totalScore, taskResults, url
  } = result || mod2nullResultObject;

  const resultObj = {
    email,
    firstName,
    lastName,
    labels: `${[...labels]}`,
    startDate: convertEpochTime(startDate),
    finishDate: convertEpochTime(finishDate),
    // totalMaxScore: maxScore,
    status,
    totalScore,
    // solvedTaskCount
  };

  let totalDuration = 0;

  taskResults.forEach((taskResult) => {
    const {
      sessionTask: { task: { title } },
      score,
      solveTime,
      timeSpent
    } = taskResult;

    const taskDuration = convertMStoMinutes(solveTime);
    const taskTimeSpent = convertMStoMinutes(timeSpent);
    const actualTime = Math.max(taskDuration, taskTimeSpent);

    // resultObj[`task-${i + 1}-title`] = title;
    // resultObj[`${title}-maxScore`] = maxScore;
    // resultObj[`task-${i + 1}-maxScore`] = maxScore;
    resultObj[`${title}-score`] = score;
    // resultObj[`task-${i + 1}-score`] = score;
    // resultObj[`${title}-solveTime`] = taskDuration;
    resultObj[`${title}-duration`] = actualTime;

    // resultObj[`${title}-replayUrl`] = replayUrl;

    totalDuration += actualTime;
  });

  resultObj.totalDuration = totalDuration;
  resultObj.publicLink = url;

  // only for SEI Diagnostics
  if (studentEmails !== undefined) {
    resultObj.campus = studentEmails[email] ? studentEmails[email].campus : 'NA';
    resultObj.fullName = studentEmails[email] ? studentEmails[email].name : `X -- ${firstName} ${lastName}`;
  }
  return resultObj;
};

// main function to get CodeSignal results
// used in the googlesheets/index.js file
const getCodeSignalResults = async (taskID, first = 0, offset = 0) => {
  const key = process.env.CODESIGNAL_API_KEY;

  // graphql query
  // first: int <- grab the 'int' most recent results
  // leave at 0 to grab all results
  // maximum value of int is 20
  // offset: int <- range of results to skip
  // leave at 0 to grab the most current results
  // int value of 10 would skip the 10 most recent results
  const query = `query companyTest($taskID: ID!) {
    companyTest(id: $taskID) {
      title
      testSessions(first: ${first}, offset: ${offset}) {
        testTaker {
          email
          firstName
          lastName
        }
        labels
        startDate
        finishDate
        maxScore
        status
        result {
          score
          solvedTaskCount
          taskResults {
            sessionTask { 
              task { 
                title
                maxScore
              } 
            }
            score
            replayUrl
            solveTime
            timeSpent
          }
          url
        }
      }
    }
  }`;

  return fetch('https://app.codesignal.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify({
      query,
      variables: { taskID }
    })
  })
    .then((r) => {
      console.log(r);
      return r.json();
    })
    .then((results) => {
      console.log('results returned:', results);
      // console.log('results returned:', JSON.stringify(results, null, 2));
      // TODO - uncomment line below to inspect actual result .json file
      fs.writeFileSync('results.json', JSON.stringify(results, null, 2), (err) => (err ? console.log(err) : console.log('file written')));
      return results;
    })
    .catch((err) => {
      console.log(err);
      return err;
    });
};

// TODO
// create wrapper function so that it takes:
// inputs:
// testTYpe
// nullValueObjectDefaults must be made per test
// mod1Diag => 2 tasks
// mod2Diag => 2 tasks
// mod3Diag => 3 tasks?
// nullValueObjectDefaults must have proper number of task results according to how many tasks were set for that test
// defaultNullObject
// for handling the destructuring of null for 'result' value

module.exports = {
  getCodeSignalResults,
  formatResultObject,
};
