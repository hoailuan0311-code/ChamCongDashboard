// qr.js - Wrapper decode QR

function decodeQR(img) {
    return new Promise((resolve) => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);

        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const result = jsQR(data.data, canvas.width, canvas.height);

        resolve(result ? result.data.trim() : null);
    });
}
