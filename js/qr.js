// qr.js
// Đọc QR từ file ảnh: crop 1 vùng góc trên bên phải rồi chạy jsQR.

async function decodeQRFromFile(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;

        const cropX = Math.floor(w * 0.5);   // nửa phải
        const cropY = 0;
        const cropW = Math.floor(w * 0.5);
        const cropH = Math.floor(h * 0.4);   // 40% trên

        const canvas = document.createElement("canvas");
        canvas.width = cropW;
        canvas.height = cropH;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

        const imageData = ctx.getImageData(0, 0, cropW, cropH);
        const code = jsQR(imageData.data, cropW, cropH);

        resolve(code ? code.data : null);
      } catch (e) {
        console.error("QR decode error:", e);
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(file);
  });
}
