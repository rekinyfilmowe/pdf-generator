const puppeteer = require('puppeteer');

(async () => {
    console.log('Installing Chromium for Puppeteer...');
    await puppeteer.createBrowserFetcher().download(puppeteer.defaultBrowserRevision);
    console.log('Chromium installed successfully.');
})();
