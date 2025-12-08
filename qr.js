// QR Decoder Wrapper

async function decodeQRFromImage(img) {
    return new Promise((resolve) => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const result = jsQR(imgData.data, canvas.width, canvas.height);

        if (result && result.data) {
            resolve(result.data.trim());
        } else {
            resolve(null);
        }
    });
}
