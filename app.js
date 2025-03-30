const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.post('/', async (req, res) => {
    const { url } = req.body;
    console.log("URL to generate PDF:", url);

    try {
        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        });

        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 0 });

        const pdfBuffer = await page.pdf({
  format: 'A4',
  printBackground: true,
  margin: {
    top: "30mm",
    bottom: "30mm",
    left: "20mm",
    right: "20mm"
  },
  displayHeaderFooter: true,
  headerTemplate: `<div style="font-size:10px; color: transparent;">.</div>`, // pusty nagłówek
  footerTemplate: `
    <div style="width:100%; font-size:10px; text-align:center; color: #999;">
      Strona <span class="pageNumber"></span> z <span class="totalPages"></span>
    </div>`
});
        await browser.close();

        const pdfBase64 = pdfBuffer.toString('base64');
        res.json({ pdfBase64 });

    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send(`Error generating PDF: ${error.message}`);
    }
});

app.listen(port, () => {
    console.log(`PDF Generator działa na porcie ${port}`);
});
