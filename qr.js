// qr.js – V17 “AI style” QR decoder
// --------------------------------
// - Auto-detect vùng QR (không cần crop tay)
// - Super-resolution bằng canvas upscale
// - Tăng tương phản, chỉnh sáng, thử nhiều biến thể
// - ZXing (nếu có) -> jsQR
// - Fallback đọc ASN nếu có window.extractASNFromImage()

(function () {
  console.log("QR Engine V17 loaded");

  // ====== UTIL CƠ BẢN ======
  function fileToImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  function createCanvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }

  // vẽ 1 vùng (ROI) của ảnh lên canvas với kích thước targetSize (super-res)
  function drawRegionToCanvas(img, region, targetSize) {
    const c = createCanvas(targetSize, targetSize);
    const ctx = c.getContext("2d", { willReadFrequently: true });

    ctx.imageSmoothingEnabled = false; // muốn edge sắc nét hơn

    ctx.drawImage(
      img,
      region.x,
      region.y,
      region.w,
      region.h,
      0,
      0,
      targetSize,
      targetSize
    );
    return c;
  }

  // tăng tương phản + chỉnh sáng đơn giản (pseudo-AI 😄)
  function applyContrastBrightness(srcCanvas, contrast, brightness) {
    // contrast: 0..2 (1 = bình thường)
    // brightness: -100..100
    const c = createCanvas(srcCanvas.width, srcCanvas.height);
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(srcCanvas, 0, 0);

    const imgData = ctx.getImageData(0, 0, c.width, c.height);
    const data = imgData.data;

    const ct = contrast;
    const br = brightness;

    for (let i = 0; i < data.length; i += 4) {
      // chuyển xám để giảm nhiễu màu
      let v = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      v = v * ct + br;
      if (v < 0) v = 0;
      if (v > 255) v = 255;
      data[i] = data[i + 1] = data[i + 2] = v;
    }

    ctx.putImageData(imgData, 0, 0);
    return c;
  }

  // hơi "sharpen" nhẹ (unsharp mask mini)
  function applySharpen(srcCanvas) {
    const w = srcCanvas.width;
    const h = srcCanvas.height;
    const c = createCanvas(w, h);
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(srcCanvas, 0, 0);

    const srcCtx = srcCanvas.getContext("2d", { willReadFrequently: true });
    const srcData = srcCtx.getImageData(0, 0, w, h);
    const out = ctx.getImageData(0, 0, w, h);

    const d = srcData.data;
    const o = out.data;

    // kernel sharpen 3x3 đơn giản
    const kernel = [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ];

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        let r = 0, g = 0, b = 0;
        let ki = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const px = x + kx;
            const py = y + ky;
            const idx = (py * w + px) * 4;
            const k = kernel[ki++];

            r += d[idx] * k;
            g += d[idx + 1] * k;
            b += d[idx + 2] * k;
          }
        }

        const idx0 = (y * w + x) * 4;
        o[idx0]     = Math.max(0, Math.min(255, r));
        o[idx0 + 1] = Math.max(0, Math.min(255, g));
        o[idx0 + 2] = Math.max(0, Math.min(255, b));
        o[idx0 + 3] = 255;
      }
    }

    ctx.putImageData(out, 0, 0);
    return c;
  }

  // ====== ZXing + jsQR WRAPPER ======
  function decodeWithJsQR(canvas) {
    if (typeof jsQR === "undefined") return null;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const qr = jsQR(imgData.data, canvas.width, canvas.height, {
      inversionAttempts: "attemptBoth",
      tryHarder: true
    });

    return qr && qr.data ? qr.data.trim() : null;
  }

  function decodeWithZXing(canvas) {
    // ZXing optional: nếu không có thì bỏ qua
    if (!window.ZXing || !ZXing.BrowserQRCodeReader) return null;
    try {
      const luminance = new ZXing.HTMLCanvasElementLuminanceSource(canvas);
      const bin = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(luminance));
      const reader = new ZXing.BrowserQRCodeReader();
      const res = reader.decodeBitmap(bin);
      return res && res.text ? res.text.trim() : null;
    } catch (e) {
      // console.debug("ZXing fail:", e && e.message);
      return null;
    }
  }

  async function tryDecodeAllVariants(baseCanvas) {
    // 1. ảnh xám + contrast nhẹ
    const v1 = applyContrastBrightness(baseCanvas, 1.4, -10);
    const v2 = applyContrastBrightness(baseCanvas, 1.8, -20);
    const v3 = applySharpen(v2);

    const candidates = [v1, v2, v3];

    for (const c of candidates) {
      // ZXing trước
      let t = decodeWithZXing(c);
      if (t) return t;

      // jsQR sau
      t = decodeWithJsQR(c);
      if (t) return t;
    }

    return null;
  }

  // ====== AUTO ROI (không cần crop tay) ======
  function generateROIs(img) {
    const w = img.width;
    const h = img.height;
    const short = Math.min(w, h);

    const sizeMain  = short * 0.55; // ROI chính
    const sizeSmall = short * 0.45; // ROI phụ

    const rois = [];

    // top-right (đa số tem QR nằm đây)
    rois.push({
      x: w - sizeMain - 40,
      y: 40,
      w: sizeMain,
      h: sizeMain
    });

    // center-top
    rois.push({
      x: (w - sizeMain) / 2,
      y: 20,
      w: sizeMain,
      h: sizeMain
    });

    // top-left (phòng khi layout khác)
    rois.push({
      x: 20,
      y: 40,
      w: sizeSmall,
      h: sizeSmall
    });

    // full chiều rộng, phần trên 60% chiều cao
    rois.push({
      x: w * 0.1,
      y: h * 0.05,
      w: w * 0.8,
      h: h * 0.6
    });

    // clamp cho chắc
    return rois.map(r => ({
      x: Math.max(0, r.x),
      y: Math.max(0, r.y),
      w: Math.min(w - r.x, r.w),
      h: Math.min(h - r.y, r.h)
    }));
  }

  // ====== PUBLIC API: decodeQRSmart ======
  // file: File ảnh
  // previewEl: <img> để show vùng crop (có thể null)
  window.decodeQRSmart = async function decodeQRSmart(file, previewEl) {
    const img = await fileToImage(file);
    const rois = generateROIs(img);

    let firstPreviewDataUrl = null;

    // thử từng ROI với nhiều scale + filter
    for (const roi of rois) {
      // super-res 720px
      const base = drawRegionToCanvas(img, roi, 720);
      const dataUrl = base.toDataURL("image/jpeg", 0.8);
      if (!firstPreviewDataUrl) firstPreviewDataUrl = dataUrl;

      let text = await tryDecodeAllVariants(base);
      if (text) {
        if (previewEl) previewEl.src = dataUrl;
        return { ok: true, value: text, source: "qr" };
      }

      // thêm 1 lần zoom mạnh hơn
      const base2 = drawRegionToCanvas(img, roi, 960);
      const dataUrl2 = base2.toDataURL("image/jpeg", 0.85);
      let text2 = await tryDecodeAllVariants(base2);
      if (text2) {
        if (previewEl) previewEl.src = dataUrl2;
        return { ok: true, value: text2, source: "qr" };
      }
    }

    // nếu không ra QR → hiển thị preview vùng tốt nhất (crop đầu tiên)
    if (previewEl && firstPreviewDataUrl) {
      previewEl.src = firstPreviewDataUrl;
    }

    // ====== FALLBACK ASN (nếu có hàm extractASNFromImage) ======
    if (typeof window.extractASNFromImage === "function") {
      try {
        const asn = await window.extractASNFromImage(img);
        if (asn) {
          return { ok: true, value: asn, source: "asn" };
        }
      } catch (e) {
        console.warn("ASN fallback error:", e);
      }
    }

    // bó tay
    return { ok: false, value: null, source: "none" };
  };
})();
