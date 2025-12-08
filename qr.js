// ==========================================
// QR ENGINE V7 — Auto-crop + Rotate + Enhance
// ==========================================

async function extractQR(file) {
  const img = await loadImage(file);

  // 1) auto crop QR region
  const crop = cropQRRegion(img);

  // 2) thử decode nhiều chế độ
  const attempts = [
    tryZXing(crop),
    tryJsQR(crop),
    tryRotate(crop, 90),
    tryRotate(crop, 180),
    tryRotate(crop, 270)
  ];

  const results = await Promise.all(attempts);

  return results.find(x => x) || null;
}

// ------------------------------
// LOAD IMAGE
function loadImage(file) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => res(img);
    img.src = URL.createObjectURL(file);
  });
}

// ------------------------------
// CROP vùng QR (top-right)
function cropQRRegion(img) {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");

  const W = img.width;
  const H = img.height;

  const qrW = W * 0.32;
  const qrH = H * 0.32;

  c.width = qrW;
  c.height = qrH;

  ctx.drawImage(
    img,
    W - qrW - 20,   // crop bên phải
    20,             // crop phía trên
    qrW,
    qrH,
    0,
    0,
    qrW,
    qrH
  );

  return c;
}

// ------------------------------
// Rotate canvas
function tryRotate(canvas, deg) {
  return new Promise(resolve => {
    const angle = deg * Math.PI / 180;

    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");

    c.width = canvas.height;
    c.height = canvas.width;

    ctx.translate(c.width/2, c.height/2);
    ctx.rotate(angle);
    ctx.drawImage(canvas, -canvas.width/2, -canvas.height/2);

    const qr = jsQRFromCanvas(c);
    resolve(qr);
  });
}

// ------------------------------
// ZXing decode
async function tryZXing(canvas) {
  if (!ZXing || !ZXing.BrowserQRCodeReader) return null;

  try {
    const reader = new ZXing.BrowserQRCodeReader();
    const result = await reader.decodeFromImage(canvas);
    return result?.text || null;
  } catch {
    return null;
  }
}

// ------------------------------
// jsQR decode
function tryJsQR(canvas) {
  const qr = jsQRFromCanvas(canvas);
  return qr;
}

function jsQRFromCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const out = jsQR(data.data, canvas.width, canvas.height, {
    inversionAttempts: "attemptBoth"
  });

  return out ? out.data : null;
}
