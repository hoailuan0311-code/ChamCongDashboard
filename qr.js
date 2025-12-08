// =====================================================
// QR ENGINE V12 – Morph + Sharpen + Adaptive Thresh
// =====================================================

console.log("QR Engine V12 loaded");

// Sharpen kernel 3×3
function applySharpen(ctx, w, h) {
    const weights = [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
    ];
    const src = ctx.getImageData(0, 0, w, h);
    const dst = ctx.createImageData(w, h);

    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            let r = 0, g = 0, b = 0;
            let idx = 0;

            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const px = ((y + ky) * w + (x + kx)) * 4;
                    const wv = weights[idx++];
                    r += src.data[px] * wv;
                    g += src.data[px+1] * wv;
                    b += src.data[px+2] * wv;
                }
            }

            const p = (y * w + x) * 4;
            dst.data[p]   = Math.min(255, Math.max(0, r));
            dst.data[p+1] = Math.min(255, Math.max(0, g));
            dst.data[p+2] = Math.min(255, Math.max(0, b));
            dst.data[p+3] = 255;
        }
    }
    ctx.putImageData(dst, 0, 0);
}

// Simple adaptive threshold
function adaptiveThreshold(ctx, w, h) {
    const img = ctx.getImageData(0, 0, w, h);

    for (let i = 0; i < img.data.length; i += 4) {
        const avg = (img.data[i] + img.data[i+1] + img.data[i+2]) / 3;
        const v = avg < 150 ? 0 : 255;
        img.data[i] = img.data[i+1] = img.data[i+2] = v;
    }
    ctx.putImageData(img, 0, 0);
}

// Try decode with ZXing
async function tryZXing(canvas) {
    try {
        const codeReader = new ZXingBrowser.BrowserQRCodeReader();
        const result = await codeReader.decodeFromImageElement(canvas);
        return result?.text || null;
    } catch {
        return null;
    }
}

// Try jsQR
function tryJsQR(canvas) {
    const ctx = canvas.getContext("2d");
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const q = jsQR(img.data, canvas.width, canvas.height);
    return q?.data || null;
}


// --------------------------------------------------
// MAIN FUNCTION – extractQR(file) V12
// --------------------------------------------------
async function extractQR(file) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = async () => {

            // --------------------------
            // AUTO CROP QR REGION
            // --------------------------
            // Vị trí QR cố định trên giấy của ông, crop 450px x 450px
            const cropX = img.width * 0.58;
            const cropY = img.height * 0.10;
            const cropW = img.width * 0.28;
            const cropH = img.width * 0.28;

            const c = document.createElement("canvas");
            c.width = cropW * 2;      // upscale 2× để tăng chi tiết
            c.height = cropH * 2;

            const ctx = c.getContext("2d");
            ctx.imageSmoothingEnabled = false;

            // upscale lần 1
            ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, c.width, c.height);

            // VIEWER (để debug ông xem crop đúng chưa)
            const box = document.getElementById("cropPreview");
            if (box) box.src = c.toDataURL("image/jpeg", 0.9);

            // --------------------------
            // ENHANCE (Sharpen + Contrast + Threshold)
            ---------------------------
            applySharpen(ctx, c.width, c.height);

            ctx.filter = "contrast(180%) brightness(115%)";
            ctx.drawImage(c, 0, 0);

            adaptiveThreshold(ctx, c.width, c.height);

            // --------------------------
            // TRY ZXING
            // --------------------------
            let qr = await tryZXing(c);
            if (qr) return resolve(qr);

            // Rotate 90° + ZXing again
            const r90 = rotateCanvas(c, Math.PI / 2);
            qr = await tryZXing(r90);
            if (qr) return resolve(qr);

            // --------------------------
            // TRY jsQR
            // --------------------------
            qr = tryJsQR(c);
            if (qr) return resolve(qr);

            // jsQR rotated
            qr = tryJsQR(r90);
            if (qr) return resolve(qr);

            return resolve(null);
        };

        img.src = URL.createObjectURL(file);
    });
}


// Rotate helper
function rotateCanvas(srcCanvas, angle) {
    const c = document.createElement("canvas");
    c.width = srcCanvas.height;
    c.height = srcCanvas.width;

    const ctx = c.getContext("2d");
    ctx.translate(c.width/2, c.height/2);
    ctx.rotate(angle);
    ctx.drawImage(srcCanvas, -srcCanvas.width/2, -srcCanvas.height/2);

    return c;
}
