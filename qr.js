//----------------------------------------------------------
// EXTRACT QR
//----------------------------------------------------------
async function extractQR(file) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const w = img.width, h = img.height;

      // Crop QR zone (bản chuẩn này)
      const cw = Math.floor(w * 0.28);
      const ch = Math.floor(h * 0.35);
      const cx = Math.floor(w * 0.63);
      const cy = Math.floor(h * 0.05);

      const canvas = document.getElementById("cropView");
      canvas.width = cw;
      canvas.height = ch;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch);

      // ZXing first
      try {
        const luminance = ctx.getImageData(0, 0, cw, ch);
        const ZX = new ZXing.BrowserMultiFormatReader();
        const res = ZX.decodeBitmap(luminance.data, cw, ch);
        if (res?.text) return resolve(res.text.trim());
      } catch {}

      // fallback jsQR
      try {
        const imgData = ctx.getImageData(0, 0, cw, ch);
        const decoded = jsQR(imgData.data, cw, ch);
        if (decoded?.data) return resolve(decoded.data.trim());
      } catch {}

      resolve(null);
    };

    img.src = URL.createObjectURL(file);
  });
}
