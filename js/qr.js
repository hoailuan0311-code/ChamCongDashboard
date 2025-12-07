async function decodeQRFromImage(file) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);

        img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            const w = img.width;
            const h = img.height;

            canvas.width = w * 0.5;
            canvas.height = h * 0.4;

            ctx.drawImage(img, w * 0.5, 0, w * 0.5, h * 0.4, 0, 0, w * 0.5, h * 0.4);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            const code = jsQR(imageData.data, canvas.width, canvas.height);
            resolve(code ? code.data : null);
        };
    });
}
