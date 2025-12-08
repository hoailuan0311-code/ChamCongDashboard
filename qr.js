/* ============================================================
   QR ENGINE V6.2 – Ultra Enhanced for Low-Quality Printed QR
   Features:
   - Auto grayscale
   - Auto contrast boost
   - Auto sharpening (Laplacian)
   - Auto QR-area crop (right-top 35%)
   - ZXing decode → fallback jsQR → rotated jsQR
============================================================ */

async function extractQR(file) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = async () => {

            // --- 1) TẠO CANVAS CƠ BẢN ---
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            // --- 2) CROP VÙNG QR (heuristic: top-right 35%) ---
            const qrW = Math.floor(img.width * 0.35);
            const qrH = Math.floor(img.height * 0.35);
            const qrX = img.width - qrW - 40;  // dịch trái 40px
            const qrY = 20;

            const cropCanvas = document.createElement("canvas");
            cropCanvas.width = qrW;
            cropCanvas.height = qrH;
            const cropCtx = cropCanvas.getContext("2d", { willReadFrequently: true });
            cropCtx.drawImage(canvas, qrX, qrY, qrW, qrH, 0, 0, qrW, qrH);

            // --- 3) PREPROCESS ẢNH ---
            preprocessImage(cropCtx, qrW, qrH);

            // --- 4) THỬ ZXing ---
            try {
                const code = await ZXingBrowser.BrowserQRCodeReader.prototype.decodeFromCanvas(cropCanvas);
                if (code && code.text) return resolve(code.text.trim());
            } catch (e) {
                console.warn("ZXing fail, switching to jsQR");
            }

            // --- 5) jsQR lần 1 ---
            let imgData = cropCtx.getImageData(0, 0, qrW, qrH);
            let qr1 = jsQR(imgData.data, qrW, qrH, { inversionAttempts: "attemptBoth" });
            if (qr1) return resolve(qr1.data.trim());

            // --- 6) jsQR xoay 90 độ ---
            const rotated = rotateCanvas(cropCanvas);
            const rCtx = rotated.getContext("2d");
            const rData = rCtx.getImageData(0, 0, rotated.width, rotated.height);

            let qr2 = jsQR(rData.data, rotated.width, rotated.height, { inversionAttempts: "attemptBoth" });
            if (qr2) return resolve(qr2.data.trim());

            resolve(null);
        };
        img.src = URL.createObjectURL(file);
    });
}


// ============================================================
//  BOOST ẢNH – grayscale + contrast + sharpen
// ============================================================
function preprocessImage(ctx, w, h) {
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;

    // grayscale + contrast
    for (let i = 0; i < d.length; i += 4) {
        let gray = (d[i] + d[i + 1] + d[i + 2]) / 3;
        gray = gray * 1.35; // tăng sáng
        if (gray > 255) gray = 255;
        d[i] = d[i + 1] = d[i + 2] = gray;
    }
    ctx.putImageData(imgData, 0, 0);

    // sharpen kernel
    const sharp = ctx.getImageData(0, 0, w, h);
    const s = sharp.data;

    const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];

    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            let sum = 0;
            let idx = (y * w + x) * 4;

            let k = 0;
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    let p = ((y + ky) * w + (x + kx)) * 4;
                    sum += d[p] * kernel[k++];
                }
            }

            sum = Math.min(255, Math.max(0, sum));
            s[idx] = s[idx + 1] = s[idx + 2] = sum;
        }
    }

    ctx.putImageData(sharp, 0, 0);
}


// ============================================================
// XOAY CANVAS 90°
// ============================================================
function rotateCanvas(src) {
    const c = document.createElement("canvas");
    c.width = src.height;
    c.height = src.width;
    const ctx = c.getContext("2d");

    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(src, -src.width / 2, -src.height / 2);

    return c;
}
