require("events").EventEmitter.defaultMaxListeners = 50;
const express = require("express");
const fetch = require("node-fetch");
const puppeteer = require("puppeteer");
const bodyParser = require("body-parser");

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
  waitUntil: "networkidle2", // mniej rygorystyczne (nie czeka na całkowite wyciszenie sieci)
  timeout: 60000             // zwiększony timeout do 60 sekund
});


    const pdfBuffer = await page.pdf({ format: "A4" });
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
