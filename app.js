const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/', async (req, res) => {
  const { url } = req.body;
  console.log("URL to generate PDF:", url);

  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({ format: 'A4' });

    await browser.close();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=generated.pdf',
    });

    res.send(pdf);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).send('Error generating PDF');
  }
});

app.listen(port, () => {
  console.log(`PDF Generator działa na porcie ${port}`);
});
