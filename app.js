require("events").EventEmitter.defaultMaxListeners = 50;
const express = require("express");
const fetch = require("node-fetch");
const puppeteer = require("puppeteer");
const bodyParser = require("body-parser");

const { addToQueue } = require("./queue");

const app = express();
app.use(bodyParser.json());

app.post("/", async (req, res) => {
  const { url, nazwaDokumentu, idKlientKarta, dataWydruku } = req.body;

  if (!url || !nazwaDokumentu || !idKlientKarta) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  // 🟢 Natychmiastowa odpowiedź do Wix
  res.status(200).json({ status: "started" });

  // 🔁 Dodaj do kolejki!
  addToQueue(async () => {
    try {
      const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      });

      const page = await browser.newPage();

      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: 60000
      });

      await page.waitForTimeout(500);

      function formatujDate(dataISO) {
        if (!dataISO) return "Brak daty";
        const date = new Date(dataISO);
        const pad = (n) => n.toString().padStart(2, "0");
        return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
      }

      const formatowanaData = formatujDate(dataWydruku);

      const pdfBuffer = await page.pdf({
        format: "A4",
        margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
        displayHeaderFooter: true,
        printBackground: true,
        timeout: 60000,
        headerTemplate: `<div style="height:0; display:none;"></div>`,
        footerTemplate: `
          <div style="font-family: Arial, sans-serif; font-size:6px; color:#212121; width: calc(100% - 30mm); margin: 0 auto;">
            <div style="display:flex; justify-content:space-between;">
              <span>Identyfikator dokumentu: ${nazwaDokumentu}</span>
              <span>Data wydruku: ${formatowanaData}</span>
            </div>
            <div style="text-align:right; margin-top:5px;">
              str. <span class="pageNumber"></span> / <span class="totalPages"></span>
            </div>
          </div>`
      });

      await browser.close();

      const pdfBase64 = pdfBuffer.toString("base64");

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

      console.log("✅ Webhook wysłany:", await response.text());
    } catch (err) {
      console.error("❌ Błąd generowania PDF lub webhooka:", err.message);
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ PDF Generator działa na porcie ${PORT}`);
});
