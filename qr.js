// qr.js
// Dùng ZXing để decode QR từ file ảnh, fallback sang jsQR nếu cần.

/**
 * Decode QR từ File ảnh.
 * Ưu tiên ZXing, nếu fail → dùng jsQR.
 * @param {File} file
 * @returns {Promise<string|null>} QR string hoặc null
 */
async function extractQR(file) {
  // 1) Thử ZXing
  try {
    const url = URL.createObjectURL(file);
    const codeReader = new ZXing.BrowserQRCodeReader();

    const result = await codeReader.decodeFromImageUrl(url);
    URL.revokeObjectURL(url);

    if (result && result.text) {
      return result.text.trim();
    }
  } catch (e) {
    console.warn("ZXing decode fail, fallback jsQR…", e);
  }

  // 2) Fallback jsQR
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      const w = img.width;
      const h = img.height;

      canvas.width = w;
      canvas.height = h;

      // tăng contrast / brightness một chút
      ctx.filter = "contrast(190%) brightness(115%)";
      ctx.drawImage(img, 0, 0, w, h);

      const imgData = ctx.getImageData(0, 0, w, h);
      const qr = jsQR(imgData.data, w, h, {
        inversionAttempts: "attemptBoth"
      });

      resolve(qr ? qr.data.trim() : null);
    };
    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(file);
  });
}
