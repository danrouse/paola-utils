const fetch = require('node-fetch');

const API_URL = 'https://app.codesignal.com/graphql';
const apiRequest = (query) => fetch(API_URL, {
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: 'Bearer OGRHZUE2TE00TU1tWWR0QXQc5/jWJfwo+2gzBHj7wlA7Bx5DhFANyIDknoOz/kWT8g==',
  },
  method: 'POST',
  body: JSON.stringify({ query }),
}).then((res) => res.json());

const MAX_RESULTS_PER_PAGE = 20; // API limit is 20
const paginatedApiRequest = async (queryGenerator, getResultFromPayload) => {
  const results = [];
  let page = 0;
  let hasNextPage = false;
  do {
    console.log('get page', page + 1);
    const result = await apiRequest(queryGenerator(page * MAX_RESULTS_PER_PAGE));
    const formattedResult = getResultFromPayload(result);
    results.push(...formattedResult);
    console.log('final res length', formattedResult.length);
    hasNextPage = formattedResult.length === MAX_RESULTS_PER_PAGE;

    page += 1;
  } while (hasNextPage);
  return results;
};

(async () => {
  await paginatedApiRequest((offset) => `
  query TestQuery {
    companyTestSessions(companyTestId: "kb3zp9cK5CYLadq22", first: ${MAX_RESULTS_PER_PAGE}, offset: ${offset}) {
      testTaker {
        email
        firstName
        lastName
      }
      startDate
      finishDate
      labels
      result {
        score
        solvedTaskCount
        taskResults {
          sessionTask {
            maxScore
          }
          timeSpent
          score
        }
      }
    }
  }
  `, (result) => result.data.companyTestSessions);
  // console.log(JSON.stringify(response, null, 2));
  console.log('done');
})();
