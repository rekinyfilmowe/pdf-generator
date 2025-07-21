require("events").EventEmitter.defaultMaxListeners = 50;
const express = require("express");
const fetch = require("node-fetch");
const puppeteer = require("puppeteer");
const bodyParser = require("body-parser");

const { addToQueue } = require("./queue");
const { uploadPdfBufferToBunny } = require("./uploadPdfBufferToBunny");

const app = express();
app.use(bodyParser.json());

app.post("/pdf", async (req, res) => {
  const { url, nazwaDokumentu, idKlientKarta } = req.body;

  if (!url || !nazwaDokumentu || !idKlientKarta) {
    return res.status(400).json({ error: "Brakuje wymaganych danych." });
  }

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    await page.waitForTimeout(500);

    const pdfBuffer = await page.pdf({
      format: "A4",
      margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
      printBackground: true
    });

    await browser.close();

    // ⬇️ Upload do Bunny
    const uploadUrl = `https://storage.bunnycdn.com/pliki-uzytkownikow/karty/${idKlientKarta}/pliki/${nazwaDokumentu}.pdf`;
    const responseUpload = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "AccessKey": process.env.BUNNY_API_KEY,
        "Content-Type": "application/pdf"
      },
      body: pdfBuffer
    });

    if (!responseUpload.ok) {
      const err = await responseUpload.text();
      return res.status(500).json({ error: "Upload error: " + err });
    }

    const publicznyLink = `https://rekiny-filmowe.b-cdn.net/karty/${idKlientKarta}/pliki/${nazwaDokumentu}.pdf`;
    return res.status(200).json({ publicznyLink });

  } catch (err) {
    console.error("❌ Błąd generowania/uploadu PDF:", err);
    return res.status(500).json({ error: err.message });
  }
});



app.post("/", async (req, res) => {
  const { url, nazwaDokumentu, idKlientKarta, dataWydruku } = req.body;

  if (!url || !nazwaDokumentu || !idKlientKarta) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  res.status(200).json({ status: "started" }); // ✅ Wix od razu dostaje odpowiedź

  addToQueue(async () => {
    try {
      const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      });

      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
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

      // ⬇️ Upload PDF do Bunny
      const publicznyLink = await uploadPdfBufferToBunny({
        buffer: pdfBuffer,
        fileName: nazwaDokumentu,
        clientId: idKlientKarta
      });

      console.log("📎 publicznyLink z uploadPdfBufferToBunny:", publicznyLink);


      // ⬇️ Webhook jak wcześniej (opcjonalnie)
      const webhookUrl = "https://www.rekinyfilmowe.pl/_functions/pdfWebhook";
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nazwaDokumentu,
          idKlientKarta,
          publicznyLink
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
