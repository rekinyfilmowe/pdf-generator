const { execSync } = require('child_process');

console.log("Installing Chromium for Puppeteer...");
execSync("npm install puppeteer@19.11.1 --force", { stdio: 'inherit' });
console.log("Chromium installed successfully.");
