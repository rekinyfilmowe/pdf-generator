const puppeteer = require('puppeteer');
const browserFetcher = puppeteer.createBrowserFetcher({
  platform: 'linux',
});

const revision = '1108766'; // Wersja zgodna z Puppeteer 19.11.1

(async () => {
    console.log(`Installing Chromium revision ${revision}...`);
    await browserFetcher.download(revision);
    console.log('Chromium installed successfully.');
})();
