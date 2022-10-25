const puppeteer = require('puppeteer');

async function executeInHeadlessBrowser(callback, showConsole) {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });
  try {
    const page = await browser.newPage();
    if (showConsole) {
      page.on('console', (c) => console.log('[Headless Browser]', c.text()));
    }
    const result = await callback(page, browser);
    await browser.close();
    return result;
  } catch (err) {
    await browser.close();
    throw err;
  }
}

module.exports = executeInHeadlessBrowser;