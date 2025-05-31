// uploadPdfBufferToBunny.js
const fetch = require("node-fetch");

const API_KEY = "fde55500-a291-4100-9eb4f4c66e5d-7c1a-4539";
const STORAGE_ZONE = "pliki-uzytkownikow";
const HOST = `https://storage.bunnycdn.com/${STORAGE_ZONE}`;
const CDN = "https://rekiny-filmowe.b-cdn.net";

async function uploadPdfBufferToBunny({ buffer, fileName, clientId }) {
  const remotePath = `karty/${clientId}/pliki/${fileName}.pdf`;
  const uploadUrl = `${HOST}/${remotePath}`;

  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "AccessKey": API_KEY,
      "Content-Type": "application/pdf"
    },
    body: buffer
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`Błąd uploadu PDF do Bunny: ${response.status} - ${responseText}`);
  }

  const publicUrl = `${CDN}/${remotePath}`;
  console.log("✅ PDF przesłany do Bunny:", publicUrl);
  return publicUrl;
}

module.exports = { uploadPdfBufferToBunny };
