// ======================================================
// LOAD ZXING
// ======================================================
let ZX = null;

(async () => {
    try {
        ZX = window.ZXingBrowser;
        if (!ZX) throw new Error("ZXingBrowser not found");
        console.log("ZXing loaded OK");
    } catch (e) {
        console.warn("Không load được ZXing", e);
    }
})();


// ======================================================
// HÀM ĐỌC QR SIÊU BỀN V6.3
// ======================================================
async function extractQR(file) {
    const imgURL = URL.createObjectURL(file);

    // --------------------------------------------------
    // LEVEL 1 → ZXing (mạnh nhất)
    // --------------------------------------------------
    if (ZX) {
        try {
            const code = await ZX.BrowserQRCodeReader.decodeFromImageUrl(imgURL);
            if (code && code.text) return code.text;
        } catch {
            // bỏ qua → chuyển fallback
        }
    }

    // --------------------------------------------------
    // LEVEL 2 → jsQR + tiền xử lý (đã proven hiệu quả cao)
    // --------------------------------------------------
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            // Tăng contrast + brightness
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.filter = "contrast(180%) brightness(110%)";
            ctx.drawImage(img, 0, 0);

            let qr = readJSQR(canvas, ctx);
            if (qr) return resolve(qr);

            // Thử xoay 90°
            canvas.width = img.height;
            canvas.height = img.width;

            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(Math.PI / 2);
            ctx.translate(-img.width / 2, -img.height / 2);
            ctx.filter = "contrast(180%) brightness(110%)";
            ctx.drawImage(img, 0, 0);
            ctx.restore();

            qr = readJSQR(canvas, ctx);
            if (qr) return resolve(qr);

            resolve(null);
        };
        img.src = imgURL;
    });
}

function readJSQR(canvas, ctx) {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const qr = jsQR(imgData.data, canvas.width, canvas.height, {
        inversionAttempts: "attemptBoth",
    });
    return qr ? qr.data : null;
}
