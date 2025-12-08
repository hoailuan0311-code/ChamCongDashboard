// ===== QR DEBUG ENGINE V7.1 =====
// Hiển thị vùng crop lên màn hình để kiểm tra.

// Load image
function loadImage(file) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => res(img);
    img.src = URL.createObjectURL(file);
  });
}

async function extractQR(file) {
  const img = await loadImage(file);

  // 1) Crop vùng QR
  const cropCanvas = cropQRRegion(img);

  // DEBUG: show preview ngay dưới bảng
  showDebugCanvas(cropCanvas);

  // 2) Decode thử
  let qr =
    await tryZXing(cropCanvas) ||
    tryJsQR(cropCanvas) ||
    await tryRotate(cropCanvas, 90) ||
    await tryRotate(cropCanvas, 180) ||
    await tryRotate(cropCanvas, 270);

  return qr || null;
}

// --------------------------------------------------
// Crop QR (top-right)
function cropQRRegion(img) {
  const W = img.width;
  const H = img.height;

  const qrW = W * 0.32;
  const qrH = H * 0.32;

  const c = document.createElement("canvas");
  c.width = qrW;
  c.height = qrH;

  const ctx = c.getContext("2d");

  ctx.drawImage(
    img,
    W - qrW - 20,  // x
    20,            // y
    qrW,
    qrH,
    0,
    0,
    qrW,
    qrH
  );

  return c;
}

// --------------------------------------------------
// Rotate + decode bằng jsQR
async function tryRotate(canvas, deg) {
  const rad = deg * Math.PI / 180;

  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");

  c.width = canvas.height;
  c.height = canvas.width;

  ctx.translate(c.width/2, c.height/2);
  ctx.rotate(rad);
  ctx.drawImage(canvas, -canvas.width/2, -canvas.height/2);

  const val = tryJsQR(c);
  return val;
}

// --------------------------------------------------
// ZXing decode
async function tryZXing(canvas) {
  try {
    const reader = new ZXing.BrowserQRCodeReader();
    const r = await reader.decodeFromImage(canvas);
    return r?.text || null;
  } catch {
    return null;
  }
}

// --------------------------------------------------
// jsQR decode
function tryJsQR(canvas) {
  const ctx = canvas.getContext("2d");
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const res = jsQR(data.data, canvas.width, canvas.height, {
    inversionAttempts: "attemptBoth"
  });

  return res?.data || null;
}

// --------------------------------------------------
// DEBUG – hiển thị ảnh crop QR zone
function showDebugCanvas(canvas) {
  let box = document.getElementById("qrDebugBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "qrDebugBox";
    box.style.marginTop = "20px";
    box.style.padding = "10px";
    box.style.border = "1px dashed #999";
    box.style.background = "#f8f9fa";
    box.innerHTML = "<b>Vùng crop QR:</b><br>";
    document.body.appendChild(box);
  }

  const img = new Image();
  img.src = canvas.toDataURL();
  img.style.width = "200px";
  img.style.marginRight = "12px";

  box.appendChild(img);
}
