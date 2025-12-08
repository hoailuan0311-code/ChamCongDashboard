// LOAD ZXING
import('https://cdn.jsdelivr.net/npm/@zxing/browser@latest').then(m => {
  window.ZXingBrowser = m.BrowserQRCodeReader;
}).catch(() => console.warn("Không load được ZXing"));

// TRY DECODE WITH ZXING → FALLBACK JSQR
async function extractQR(file) {
  const img = new Image();
  img.src = URL.createObjectURL(file);

  await img.decode();

  // Try ZXing
  try {
    const reader = new ZXingBrowser();
    const res = await reader.decodeFromImage(img);
    if (res && res.text) return res.text.trim();
  } catch (e) {
    console.warn("ZXing fail → fallback jsQR");
  }

  // Fallback jsQR
  return new Promise(resolve => {
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext("2d");

    ctx.drawImage(img, 0, 0);

    const data = ctx.getImageData(0, 0, c.width, c.height);
    const qr = jsQR(data.data, c.width, c.height);

    resolve(qr ? qr.data.trim() : null);
  });
}
