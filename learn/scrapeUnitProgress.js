const executeInHeadlessBrowser = require('../puppeteer');
const { LEARN_COHORT_ID } = require('../config/cohorts');

const UNIT_PROGRESS_URL = `https://learn-2.galvanize.com/cohorts/${LEARN_COHORT_ID}/unit_progress`;

module.exports = function scrapeUnitProgress() {
  if (!process.env.LEARN_SCRAPE_USER_EMAIL || !process.env.LEARN_SCRAPE_USER_PASSWORD) {
    throw new Error('LEARN_SCRAPE_USER_EMAIL and LEARN_SCRAPE_USER_PASSWORD must be set in the environment to use the Learn scraper');
  }
  return executeInHeadlessBrowser(async (page) => {
    await page.goto(UNIT_PROGRESS_URL);
    await page.type('#user_email', process.env.LEARN_SCRAPE_USER_EMAIL, { delay: 100 });
    await page.type('#user_password', process.env.LEARN_SCRAPE_USER_PASSWORD, { delay: 100 });
    await page.$eval('#new_user', (form) => form.submit(), { delay: 100 });
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await page.goto(UNIT_PROGRESS_URL);
    const reactProps = await page.$eval(
      '[data-react-class^="cohorts/unit_progress/UnitProgress"]',
      (container) => JSON.parse(container.dataset.reactProps),
    );
    return reactProps.students.map((student) => {
      const progress = reactProps.submissionData.completion_progress[student.id];
      let completed = 0, total = 0;
      Object.values(progress).forEach((section) =>
        Object.values(section).forEach((lesson) => {
          completed += lesson.completed;
          total += lesson.total;
        }));
      return {
        id: student.id,
        name: student.full_name,
        email: student.email,
        completed,
        total,
        progress: completed / total,
      };
    });
  });
};
