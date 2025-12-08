/****************************************************
 * QR ENGINE V14 – AUTO DETECT + OCR BACKUP
 ****************************************************/

console.log("QR Engine V14 loaded");

/* TESSERACT OCR LOAD */
const TESSERACT = "https://cdn.jsdelivr.net/npm/tesseract.js@5.0.2/dist/tesseract.min.js";
let tesseractLoaded = false;

function loadOcrEngine() {
    if (tesseractLoaded) return Promise.resolve();
    return new Promise(res => {
        const s = document.createElement("script");
        s.src = TESSERACT;
        s.onload = () => { tesseractLoaded = true; res(); };
        document.body.appendChild(s);
    });
}

/****************************************************
 * MAIN: extractCode(file)
 ****************************************************/
async function extractCode(file, previewCanvas) {
    const img = await fileToImage(file);

    // 1) Tự động tìm QR qua ZXing + jsQR
    let qr = await detectQR(img, previewCanvas);

    if (qr) return { type: "QR", code: qr };

    // 2) Nếu QR FAIL → chạy OCR tìm CHxxxxx
    let asn = await detectASN(img, previewCanvas);

    if (asn) return { type: "ASN", code: asn };

    return null;
}

/****************************************************
 * Detect QR bằng ZXing + jsQR + enhancement
 ****************************************************/
async function detectQR(img, previewCanvas) {
    drawPreview(img, previewCanvas);

    let raw = await tryZXing(img);
    if (raw) return cleanQR(raw);

    raw = await tryJsQR(img);
    if (raw) return cleanQR(raw);

    raw = await tryEnhanceThenJsQR(img);
    if (raw) return cleanQR(raw);

    return null;
}

function cleanQR(t) {
    return t.trim().replace(/[^A-Za-z0-9]/g, "");
}

/****************************************************
 * ZXing
 ****************************************************/
async function tryZXing(img) {
    try {
        const codeReader = new ZXing.BrowserQRCodeReader();
        const r = await codeReader.decodeFromImage(img);
        return r?.text || null;
    } catch (e) {
        console.warn("ZXing fail:", e?.message);
        return null;
    }
}

/****************************************************
 * jsQR normal
 ****************************************************/
async function tryJsQR(img) {
    const { data, width, height } = getImageData(img);
    const r = jsQR(data, width, height);
    return r?.data || null;
}

/****************************************************
 * Enhancement → jsQR
 ****************************************************/
async function tryEnhanceThenJsQR(img) {
    let { canvas, ctx, w, h } = createCanvas(img);

    ctx.filter = "contrast(180%) brightness(120%)";
    ctx.drawImage(img, 0, 0, w, h);

    const id = ctx.getImageData(0, 0, w, h);
    const r = jsQR(id.data, w, h);
    return r?.data || null;
}

/****************************************************
 * OCR – tìm CHxxxxx
 ****************************************************/
async function detectASN(img, previewCanvas) {
    await loadOcrEngine();

    drawPreview(img, previewCanvas);

    const { canvas } = createCanvas(img);

    const worker = await Tesseract.createWorker("eng");

    const { data } = await worker.recognize(canvas);

    await worker.terminate();

    const text = data.text || "";

    const match = text.match(/(CH|CR)[0-9]{6,12}/i);

    return match ? match[0].toUpperCase() : null;
}

/****************************************************
 * Utilities
 ****************************************************/
function fileToImage(file) {
    return new Promise(res => {
        const img = new Image();
        img.onload = () => res(img);
        img.src = URL.createObjectURL(file);
    });
}

function createCanvas(img) {
    const canvas = document.createElement("canvas");
    const w = img.width;
    const h = img.height;
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    return { canvas, ctx, w, h };
}

function getImageData(img) {
    const { canvas, ctx, w, h } = createCanvas(img);
    const data = ctx.getImageData(0, 0, w, h);
    return { data: data.data, width: w, height: h };
}

function drawPreview(img, previewCanvas) {
    if (!previewCanvas) return;
    previewCanvas.width = img.width;
    previewCanvas.height = img.height;
    const ctx = previewCanvas.getContext("2d");
    ctx.drawImage(img, 0, 0, img.width, img.height);
}

