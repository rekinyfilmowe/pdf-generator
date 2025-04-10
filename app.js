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

    

await page.waitForTimeout(500);
    
    // Data generowania dokumentu
    const { dataWydruku } = req.body;

function formatujDate(dataISO) {
  if (!dataISO) return "Brak daty";
  const date = new Date(dataISO);

  const pad = (n) => n.toString().padStart(2, "0");

  const dzien = pad(date.getDate());
  const miesiac = pad(date.getMonth() + 1); // miesiące są od 0
  const rok = date.getFullYear();

  const godzina = pad(date.getHours());
  const minuta = pad(date.getMinutes());
  const sekunda = pad(date.getSeconds());

  return `${dzien}.${miesiac}.${rok}, ${godzina}:${minuta}:${sekunda}`;
}

const formatowanaData = formatujDate(dataWydruku);
    
    

    // Generowanie PDF
    const pdfBuffer = await page.pdf({
  format: "A4",
  margin: {
    top: "20mm",
    bottom: "20mm",
    left: "15mm",
    right: "15mm"
  },
  displayHeaderFooter: true,  // Ważne – żeby stopka i nagłówek się pojawiły
  printBackground: true,     // Ważne – żeby tło było załadowane
  timeout: 60000,

      headerTemplate: `
  <div style="height:0; display:none;"></div>
`,
      
footerTemplate: `
  <div style="font-family: Arial, sans-serif; font-size:6px; color:#212121; width: calc(100% - 30mm); margin: 0 auto;">
    <div style="display:flex; justify-content:space-between;">
      <span>Identyfikator dokumentu: ${nazwaDokumentu}</span>
      <span>Data wydruku: ${formatowanaData}</span>
    </div>
    <div style="text-align:right; margin-top:5px;">
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
        pdfBase64,
        dataWydruku
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
