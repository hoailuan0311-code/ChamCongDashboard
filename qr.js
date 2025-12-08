// qr.js – V16 Turbo, multi-thread decode
console.log("QR Engine V16 (worker pool) loaded");

// ---------- Worker Pool ----------
const WORKER_COUNT = 4;          // 4 thread song song (100 file vẫn chạy được)
const workers = [];
const idleWorkers = [];
const jobQueue = [];
const pendingJobs = new Map();
let jobSeq = 1;

function ensureWorkers() {
  if (workers.length) return;

  for (let i = 0; i < WORKER_COUNT; i++) {
    const w = new Worker("qr_worker.js");
    w.onmessage = (e) => {
      const { jobId, ok, type, code, error } = e.data;
      const job = pendingJobs.get(jobId);
      if (!job) return;

      pendingJobs.delete(jobId);
      idleWorkers.push(w);
      runNextJob(); // lấy job tiếp theo trong queue

      if (ok) {
        job.resolve({ ok: true, type, code });
      } else {
        job.resolve({ ok: false, error });
      }
    };
    workers.push(w);
    idleWorkers.push(w);
  }
}

function runNextJob() {
  if (!idleWorkers.length || !jobQueue.length) return;
  const w = idleWorkers.pop();
  const { jobId, width, height, buffer } = jobQueue.shift();
  w.postMessage({ jobId, width, height, buffer }, [buffer]);
}

function runWorkerJob(imageData) {
  ensureWorkers();

  return new Promise((resolve) => {
    const jobId = jobSeq++;
    pendingJobs.set(jobId, { resolve });

    const buffer = imageData.data.buffer; // chuyển ArrayBuffer

    jobQueue.push({
      jobId,
      width: imageData.width,
      height: imageData.height,
      buffer
    });

    runNextJob();
  });
}

// ---------- Image helpers ----------
async function loadImageScaled(file, maxWidth = 900) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width;
      let h = img.height;

      if (w > maxWidth) {
        h = (h * maxWidth) / w;
        w = maxWidth;
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);

      resolve({ canvas, ctx });
    };
    img.src = URL.createObjectURL(file);
  });
}

// OCR fallback -> đọc ASN CH/CR
async function ocrToASN(canvas) {
  if (!window.Tesseract) return null;

  try {
    const { data } = await Tesseract.recognize(canvas, "eng");
    const text = (data && data.text) || "";

    // Ưu tiên CH, rồi CR
    const mCH = text.match(/CH\d{6,}/i);
    const mCR = text.match(/CR\d{6,}/i);

    if (mCH) return mCH[0].toUpperCase();
    if (mCR) return mCR[0].toUpperCase();
    return null;
  } catch (e) {
    console.warn("OCR error:", e);
    return null;
  }
}

// ---------- Public API ----------
// file: File/Blob ảnh
// previewCanvas: canvas để show preview (có thể null)
async function extractCode(file, previewCanvas) {
  // 1) Resize + preview
  const { canvas, ctx } = await loadImageScaled(file, 900);

  if (previewCanvas) {
    previewCanvas.width = canvas.width;
    previewCanvas.height = canvas.height;
    const pctx = previewCanvas.getContext("2d");
    pctx.drawImage(canvas, 0, 0);
  }

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // 2) Gửi sang worker pool decode QR song song
  const qrResult = await runWorkerJob(imgData);

  if (qrResult.ok && qrResult.code) {
    return {
      type: "QR",
      code: qrResult.code.trim()
    };
  }

  // 3) Nếu QR không ra → OCR fallback đọc ASN
  const asn = await ocrToASN(canvas);
  if (asn) {
    return {
      type: "ASN",
      code: asn
    };
  }

  // 4) Bó tay
  return null;
}
