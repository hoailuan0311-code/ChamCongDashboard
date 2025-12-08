// =====================================================
// QR ENGINE V13 – Auto detect QR (no crop)
// Full-image search + enhance + rotate + ZXing fallback
// =====================================================

console.log("QR Engine V13 loaded");

// ---------------- Utils: rotate canvas ----------------
function rotateCanvas(srcCanvas, angleRad) {
  const c = document.createElement("canvas");
  c.width = srcCanvas.height;
  c.height = srcCanvas.width;

  const ctx = c.getContext("2d");
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate(angleRad);
  ctx.drawImage(srcCanvas, -srcCanvas.width / 2, -srcCanvas.height / 2);

  return c;
}

// ------------- Enhance: gray + contrast + thresh + dilate -------------
function enhanceStrong(ctx, w, h) {
  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;
  const len = w * h;
  let sumGray = 0;

  // 1) To gray + tính trung bình
  for (let i = 0, p = 0; i < len; i++, p += 4) {
    const g = (data[p] + data[p + 1] + data[p + 2]) / 3;
    sumGray += g;
    data[p] = data[p + 1] = data[p + 2] = g;
  }

  const mean = sumGray / len;
  const thr = mean * 0.9; // hơi thấp để bắt nét mờ

  // 2) Threshold (nhị phân)
  for (let i = 0, p = 0; i < len; i++, p += 4) {
    const v = data[p] < thr ? 0 : 255;
    data[p] = data[p + 1] = data[p + 2] = v;
  }

  // 3) Dilation 3x3 – "nở" nét đen cho QR mỏng
  const src = new Uint8ClampedArray(len);
  for (let i = 0, p = 0; i < len; i++, p += 4) {
    src[i] = data[p]; // 0 hoặc 255
  }

  const w1 = w, h1 = h;
  const dest = new Uint8ClampedArray(len);

  for (let y = 1; y < h1 - 1; y++) {
    for (let x = 1; x < w1 - 1; x++) {
      let black = false;
      for (let ky = -1; ky <= 1 && !black; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = (y + ky) * w1 + (x + kx);
          if (src[idx] < 128) { black = true; break; }
        }
      }
      dest[y * w1 + x] = black ? 0 : 255;
    }
  }

  // copy viền ngoài (giữ nguyên)
  for (let x = 0; x < w1; x++) {
    dest[x] = src[x];
    dest[(h1 - 1) * w1 + x] = src[(h1 - 1) * w1 + x];
  }
  for (let y = 0; y < h1; y++) {
    dest[y * w1] = src[y * w1];
    dest[y * w1 + (w1 - 1)] = src[y * w1 + (w1 - 1)];
  }

  // 4) Ghi ngược lại RGBA
  for (let i = 0, p = 0; i < len; i++, p += 4) {
    const v = dest[i];
    data[p] = data[p + 1] = data[p + 2] = v;
  }

  ctx.putImageData(img, 0, 0);
}

// ------------- jsQR helper trên 1 canvas -------------
function tryJsQR(canvas) {
  const ctx = canvas.getContext("2d");
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const res = jsQR(img.data, canvas.width, canvas.height, {
    inversionAttempts: "attemptBoth"
  });
  return res ? res.data.trim() : null;
}

// ------------- ZXing fallback -------------
async function tryZXingOnImage(imgEl) {
  if (!window.ZXing || !ZXing.BrowserQRCodeReader) {
    return null;
  }
  try {
    const reader = new ZXing.BrowserQRCodeReader();
    const result = await reader.decodeFromImageElement(imgEl);
    return result && result.text ? result.text.trim() : null;
  } catch (e) {
    console.warn("ZXing fallback fail:", e.message || e);
    return null;
  }
}

// =====================================================
//  MAIN: extractQR(file) – AUTO DETECT, NO CROP
// =====================================================
async function extractQR(file) {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = async () => {
      // ----- scale về max 1600 để xử lý nhanh -----
      const MAX = 1600;
      let w = img.width;
      let h = img.height;
      let scale = 1;

      if (w > h && w > MAX) scale = MAX / w;
      else if (h > MAX) scale = MAX / h;

      w = Math.round(w * scale);
      h = Math.round(h * scale);

      const baseCanvas = document.createElement("canvas");
      baseCanvas.width = w;
      baseCanvas.height = h;

      const ctx = baseCanvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, w, h);

      // Optional: preview full ảnh cho dễ debug
      const pv = document.getElementById("cropPreview");
      if (pv) {
        pv.src = baseCanvas.toDataURL("image/jpeg", 0.85);
      }

      // ----- 1) jsQR trên ảnh gốc -----
      let text = tryJsQR(baseCanvas);
      if (text) return resolve(text);

      // ----- 2) Enhance mạnh rồi jsQR lại -----
      const enhCanvas = document.createElement("canvas");
      enhCanvas.width = w;
      enhCanvas.height = h;
      const ectx = enhCanvas.getContext("2d");
      ectx.drawImage(baseCanvas, 0, 0);

      enhanceStrong(ectx, w, h);

      if (pv) {
        // preview ảnh đã enhance
        pv.src = enhCanvas.toDataURL("image/jpeg", 0.9);
      }

      text = tryJsQR(enhCanvas);
      if (text) return resolve(text);

      // ----- 3) Xoay 90 độ + jsQR -----
      const rot90 = rotateCanvas(enhCanvas, Math.PI / 2);
      text = tryJsQR(rot90);
      if (text) return resolve(text);

      // ----- 4) ZXing fallback trên ảnh gốc -----
      const zText = await tryZXingOnImage(img);
      if (zText) return resolve(zText);

      // bó tay luôn
      return resolve(null);
    };

    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(file);
  });
}
