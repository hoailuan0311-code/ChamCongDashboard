// =============================================
// QR DECODER V6.5 — ZXing + jsQR fallback
// =============================================

// ZXing reader
const ZX = ZXing.BrowserMultiFormatReader
  ? new ZXing.BrowserMultiFormatReader()
  : null;

console.log("ZXing loaded:", !!ZX);

/**
 * decodeQR(file)
 * return: string hoặc null
 */
async function extractQR(file) {
  const img = await loadImage(file);

  // ---------- Try ZXing ----------
  if (ZX) {
    try {
      const result = await ZX.decodeFromImage(img);
      if (result && result.text) return result.text.trim();
    } catch (e) {
      console.warn("ZXing decode fail → fallback jsQR");
    }
  }

  // ---------- Try jsQR fallback ----------
  return decodeWithJsQR(img);
}

function decodeWithJsQR(img) {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  c.width = img.width;
  c.height = img.height;

  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);

  const qr = jsQR(data.data, c.width, c.height, {
    inversionAttempts: "attemptBoth"
  });

  return qr ? qr.data.trim() : null;
}

function loadImage(file) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => res(img);
    img.src = URL.createObjectURL(file);
  });
}
