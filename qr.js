// decode QR từ file ảnh (bắt buộc)
// trả về: string QR hoặc null nếu không đọc được
async function decodeQRFromFile(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // crop vùng QR: góc trên bên phải (khoảng 30% chiều rộng & 30% chiều cao)
      const cw = Math.floor(img.width * 0.30);
      const ch = Math.floor(img.height * 0.30);
      const sx = img.width - cw;
      const sy = 0;

      const imageData = ctx.getImageData(sx, sy, cw, ch);

      const code = jsQR(imageData.data, cw, ch);
      resolve(code ? code.data : null);
    };
    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(file);
  });
}
