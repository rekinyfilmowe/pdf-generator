require("events").EventEmitter.defaultMaxListeners = 50;
const express = require("express");
const fetch = require("node-fetch");
const puppeteer = require("puppeteer");
const bodyParser = require("body-parser");

const fs = require("fs");
const path = require("path");

const app = express();
app.use(bodyParser.json());

app.post("/", async (req, res) => {
  const { url, nazwaDokumentu, idKlientKarta } = req.body;

  if (!url || !nazwaDokumentu || !idKlientKarta) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  // 🟢 Odpowiedź natychmiast do Wix (unika 504!)
  res.status(200).json({ status: "started" });

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    
    await page.goto(url, {
      waitUntil: "networkidle2", // mniej rygorystyczne czekanie
      timeout: 60000             // zwiększony timeout do 60 sekund
    });

    // Wczytanie czcionki
    const fontPath = path.join(__dirname, "Sofia Pro Light.otf");
    const fontBuffer = fs.readFileSync(fontPath);
    const fontBase64 = fontBuffer.toString("base64");

    await page.addStyleTag({
      content: `
    @font-face {
      font-family: 'Sofia Pro Light';
      src: url(data:font/opentype;base64,${fontBase64}) format("opentype");
      font-weight: normal;
      font-style: normal;
    }

    body {
      font-family: 'Sofia Pro Light', sans-serif;
      color: #212121;
    }
  `
    });

    // Data generowania dokumentu
    const dataGenerowania = new Date();
    const formatowanaData = `${String(dataGenerowania.getDate()).padStart(2, '0')}.${String(dataGenerowania.getMonth() + 1).padStart(2, '0')}.${dataGenerowania.getFullYear()}, ${String(dataGenerowania.getHours()).padStart(2, '0')}:${String(dataGenerowania.getMinutes()).padStart(2, '0')}`;

    // Wczytanie obrazu
    const imagePath = path.join(__dirname, "rf_fb_tlo.png");
    const imageBuffer = fs.readFileSync(imagePath);
    const imageBase64 = imageBuffer.toString("base64");

    // Generowanie PDF
    const pdfBuffer = await page.pdf({
  format: "A4",
  margin: {
    top: "30mm",
    bottom: "20mm",
    left: "20mm",
    right: "20mm"
  },
  displayHeaderFooter: true,  // Ważne – żeby stopka i nagłówek się pojawiły
  printBackground: true,     // Ważne – żeby tło było załadowane
  timeout: 60000,

  // Nagłówek
  headerTemplate: `
    <div style="width:100%; text-align:center;">
    <img src="data:image/png;base64,${imageBase64}" style="height:30px; margin-top:10px;" />
  </div>
  `,

  // Stopka
  footerTemplate: `
    <div style="width:100%; box-sizing:border-box; padding:0 20mm; font-size:8px; color:#212121; font-family: 'Sofia Pro Light', sans-serif;">
    <div style="display: flex; justify-content: space-between;">
      <div>Identyfikator dokumentu: ${nazwaDokumentu}</div>
      <div>Data wydruku: ${formatowanaData}</div>
    </div>
    <div style="text-align: right; margin-top: 2px;">
      str. <span class="pageNumber"></span> / <span class="totalPages"></span>
    </div>
  </div>
  `
});



    await browser.close();

    const pdfBase64 = pdfBuffer.toString("base64");

    // 🔔 Wyślij webhooka do Wix
    const webhookUrl = "https://www.rekinyfilmowe.pl/_functions/pdfWebhook";

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nazwaDokumentu,
        idKlientKarta,
        pdfBase64
      })
    });

    console.log("Webhook sent to Wix:", await response.text());
  } catch (err) {
    console.error("Błąd podczas generowania PDF lub wysyłania webhooka:", err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PDF Generator działa na porcie ${PORT}`);
});
