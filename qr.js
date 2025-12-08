//------------------------------------------------------------
// QR ENGINE V8 – HARD MODE
//------------------------------------------------------------

// Load ZXing
let ZX = null;
(async () => {
    try {
        ZX = await import("https://cdn.jsdelivr.net/npm/@zxing/browser@latest/+esm");
        console.log("ZXing loaded:", !!ZX);
    } catch (e) {
        console.warn("Không load được ZXing:", e);
    }
})();


// Convert to canvas
function imgToCanvas(img) {
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    c.getContext("2d").drawImage(img, 0, 0);
    return c;
}


// Basic grayscale
function grayscale(ctx, w, h) {
    const d = ctx.getImageData(0, 0, w, h);
    const px = d.data;

    for (let i = 0; i < px.length; i += 4) {
        const v = px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11;
        px[i] = px[i + 1] = px[i + 2] = v;
    }

    ctx.putImageData(d, 0, 0);
}


// Sharpen filter
function sharpen(ctx, w, h) {
    const src = ctx.getImageData(0, 0, w, h);
    const dst = ctx.createImageData(w, h);

    const kernel = [
         0, -1,  0,
        -1,  5, -1,
         0, -1,  0
    ];

    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            let r = 0, g = 0, b = 0;
            let idx = 0;

            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const px = ((y + ky) * w + (x + kx)) * 4;
                    const k = kernel[idx++];

                    r += src.data[px] * k;
                    g += src.data[px + 1] * k;
                    b += src.data[px + 2] * k;
                }
            }

            const pos = (y * w + x) * 4;
            dst.data[pos] = Math.min(255, Math.max(0, r));
            dst.data[pos + 1] = Math.min(255, Math.max(0, g));
            dst.data[pos + 2] = Math.min(255, Math.max(0, b));
            dst.data[pos + 3] = 255;
        }
    }

    ctx.putImageData(dst, 0, 0);
}


// Adaptive threshold
function threshold(ctx, w, h, th = 128) {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
        const v = d[i] > th ? 255 : 0;
        d[i] = d[i + 1] = d[i + 2] = v;
    }
    ctx.putImageData(img, 0, 0);
}


// Try ZXing decode
async function tryZXing(canvas) {
    if (!ZX) return null;
    try {
        const codeReader = new ZX.BrowserQRCodeReader(undefined, {
            tryHarder: true
        });
        const result = await codeReader.decodeFromImageUrl(canvas.toDataURL());
        return result.text || null;
    } catch {
        return null;
    }
}


// Try jsQR
function tryJsQR(canvas) {
    const ctx = canvas.getContext("2d");
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const qr = jsQR(img.data, canvas.width, canvas.height, { inversionAttempts: "attemptBoth" });
    return qr ? qr.data : null;
}


// Rotate canvas
function rotateCanvas(c, deg) {
    const rad = deg * Math.PI / 180;
    const out = document.createElement("canvas");
    out.width = c.height;
    out.height = c.width;

    const ctx = out.getContext("2d");
    ctx.translate(out.width / 2, out.height / 2);
    ctx.rotate(rad);
    ctx.drawImage(c, -c.width / 2, -c.height / 2);

    return out;
}


// MAIN FUNCTION
//------------------------------------------------------------
async function extractQR(file) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = async () => {

            // --- 1) Tạo canvas gốc ---
            let c = imgToCanvas(img);
            let ctx = c.getContext("2d");

            // --- 2) Crop QR fixed template ---
            const W = img.width, H = img.height;
            const x = W * 0.63;
            const y = H * 0.09;
            const w = W * 0.28;
            const h = H * 0.28;

            const crop = document.createElement("canvas");
            crop.width = w;
            crop.height = h;
            crop.getContext("2d").drawImage(img, x, y, w, h, 0, 0, w, h);

            // Hiển thị crop debug
            const dbg = document.getElementById("qrCropDebug");
            if (dbg) dbg.src = crop.toDataURL();

            const tests = [];

            // RAW decode
            tests.push(() => tryZXing(crop));
            tests.push(() => tryJsQR(crop));

            // Enhanced canvas
            const e = document.createElement("canvas");
            e.width = w;
            e.height = h;
            let ectx = e.getContext("2d");
            ectx.drawImage(crop, 0, 0);

            grayscale(ectx, w, h);
            threshold(ectx, w, h, 140);
            sharpen(ectx, w, h);

            tests.push(() => tryZXing(e));
            tests.push(() => tryJsQR(e));

            // Rotations
            const r90 = rotateCanvas(e, 90);
            const r180 = rotateCanvas(e, 180);
            const r270 = rotateCanvas(e, 270);

            tests.push(() => tryZXing(r90));
            tests.push(() => tryZXing(r180));
            tests.push(() => tryZXing(r270));
            tests.push(() => tryJsQR(r90));
            tests.push(() => tryJsQR(r180));
            tests.push(() => tryJsQR(r270));

            // RUN ALL TESTS SEQUENTIALLY
            for (let t of tests) {
                const out = await t();
                if (out) return resolve(out);
            }

            resolve(null);
        };

        img.src = URL.createObjectURL(file);
    });
}
