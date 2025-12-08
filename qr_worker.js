// qr_worker.js  – V16
// Worker chỉ làm nhiệm vụ: nhận ImageData -> jsQR (nhiều biến thể) -> trả code

// jsQR trong worker
importScripts("https://unpkg.com/jsqr@1.4.0/dist/jsQR.js");

self.onmessage = function (e) {
  const { jobId, width, height, buffer } = e.data;

  try {
    const data = new Uint8ClampedArray(buffer);
    const imgData = new ImageData(data, width, height);

    // 1) Thử bản gốc
    let result = jsQR(imgData.data, width, height);

    // 2) Nếu fail → tăng tương phản + threshold nhẹ
    if (!result) {
      const processed = new Uint8ClampedArray(imgData.data.length);
      for (let i = 0; i < imgData.data.length; i += 4) {
        const r = imgData.data[i];
        const g = imgData.data[i + 1];
        const b = imgData.data[i + 2];
        let v = 0.299 * r + 0.587 * g + 0.114 * b; // gray

        // tăng tương phản + hơi threshold
        v = (v - 128) * 1.6 + 128;
        if (v > 255) v = 255;
        if (v < 0) v = 0;
        const t = v > 140 ? 255 : 0; // nhích ngưỡng

        processed[i] = processed[i + 1] = processed[i + 2] = t;
        processed[i + 3] = imgData.data[i + 3];
      }

      result = jsQR(processed, width, height);
    }

    if (result && result.data) {
      self.postMessage({
        jobId,
        ok: true,
        type: "QR",
        code: result.data.trim()
      });
    } else {
      self.postMessage({ jobId, ok: false });
    }
  } catch (err) {
    self.postMessage({
      jobId,
      ok: false,
      error: err && err.message ? err.message : String(err)
    });
  }
};
