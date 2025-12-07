// upload.js

// === CONFIG REPO ===
const repoUser = "hoailuan0311-code";
const repoName = "ChamCongDashboard";

// ⚠ THAY BẰNG TOKEN SERVICE (FINE-GRAINED, CHỈ CHO REPO NÀY)
// ĐỪNG commit token thật lên repo public.
const SERVICE_TOKEN = "YOUR_SERVICE_TOKEN_HERE";

// === UI helper ===
function logGlobal(text, type = "info") {
  const box = document.getElementById("status");
  const color = type === "error" ? "#dc2626" : "#111827";
  box.innerHTML += `<div style="color:${color};">${text}</div>`;
  box.scrollTop = box.scrollHeight;
}

function updateGlobalProgress(done, total) {
  const bar = document.getElementById("globalProgressBar");
  const percent = total === 0 ? 0 : (done / total) * 100;
  bar.style.width = `${percent}%`;
}

function addProcessItem(file, thumbURL) {
  const container = document.getElementById("processingList");
  const div = document.createElement("div");
  div.className = "process-item";
  div.innerHTML = `
    <img src="${thumbURL}" class="process-thumb">
    <div class="process-info">
      <div class="process-title">${file.name}</div>
      <div class="progress-mini"><div class="progress-mini-bar"></div></div>
      <div class="file-log">⏳ Đang chuẩn bị...</div>
    </div>
  `;
  container.appendChild(div);
  return div;
}

// === Image utils ===
async function compressImage(file, maxSize = 1400, quality = 0.4) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;

      if (w > maxSize) {
        h = Math.round(h * (maxSize / w));
        w = maxSize;
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => resolve(blob),
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(file);
  });
}

async function createThumb(file, maxSize = 300) {
  return compressImage(file, maxSize, 0.7);
}

async function blobToBase64(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Base64 cho text (log JSON)
function encodeBase64Text(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
function decodeBase64Text(str) {
  return decodeURIComponent(escape(atob(str)));
}

// === GitHub API ===
async function uploadToGitHub(path, base64Content, message) {
  const url = `https://api.github.com/repos/${repoUser}/${repoName}/contents/${encodeURIComponent(path)}`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${SERVICE_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: message || `Upload ${path}`,
      content: base64Content,
      branch: "main"
    })
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Upload error:", data);
    throw new Error(data.message || "Upload failed");
  }
  return data;
}

// Ghi log vào logs/upload_log.json
async function saveLogEntry(entry) {
  const logPath = "logs/upload_log.json";
  const url = `https://api.github.com/repos/${repoUser}/${repoName}/contents/${logPath}`;

  let existing = [];
  let sha = null;

  const res = await fetch(url, {
    headers: { "Authorization": `Bearer ${SERVICE_TOKEN}` }
  });

  if (res.ok) {
    const data = await res.json();
    sha = data.sha;
    try {
      const raw = decodeBase64Text(data.content.replace(/\n/g, ""));
      existing = JSON.parse(raw);
    } catch {
      existing = [];
    }
  }

  existing.push(entry);
  const newContent = encodeBase64Text(JSON.stringify(existing, null, 2));

  const putBody = {
    message: "Update upload log",
    content: newContent,
    branch: "main"
  };
  if (sha) putBody.sha = sha;

  const putRes = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${SERVICE_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(putBody)
  });

  if (!putRes.ok) {
    console.error("Log update failed:", await putRes.text());
  }
}

// === MAIN FLOW ===
async function startUpload() {
  const input = document.getElementById("fileInput");
  const files = Array.from(input.files || []);
  if (files.length === 0) {
    alert("Chưa chọn hình nào.");
    return;
  }

  const user = window.currentUploadUser || { username: "unknown", displayName: "Unknown" };
  logGlobal(`User ${user.username} bắt đầu xử lý ${files.length} hình...`);

  let doneCount = 0;

  for (const file of files) {
    // thumbnail
    const thumbBlob = await createThumb(file, 260);
    const thumbURL = URL.createObjectURL(thumbBlob || file);
    const item = addProcessItem(file, thumbURL);
    const bar = item.querySelector(".progress-mini-bar");
    const fileLog = item.querySelector(".file-log");
    const setProgress = (pct) => (bar.style.width = `${pct}%`);
    const setLog = (html, isError = false) => {
      fileLog.innerHTML = html;
      fileLog.className = "file-log" + (isError ? " error" : "");
    };

    setProgress(10);
    setLog("🔍 Đang đọc QR từ ảnh gốc...");

    const qrText = await decodeQRFromFile(file);

    setProgress(40);
    setLog("🗜 Đang nén ảnh (giảm dung lượng)...");

    const compressedBlob = await compressImage(file, 1400, 0.4);
    if (!compressedBlob) {
      setProgress(100);
      setLog("❌ Lỗi nén ảnh", true);
      logGlobal(`❌ ${file.name}: lỗi nén ảnh`, "error");
      continue;
    }

    const base64Img = await blobToBase64(compressedBlob);
    const timeStr = new Date().toISOString();

    try {
      if (!qrText) {
        const failedPath = `inbox/Failed/${file.name}`;
        setProgress(70);
        setLog("⚠️ Không đọc được QR → upload vào Failed...");

        await uploadToGitHub(failedPath, base64Img, `Upload failed image ${file.name}`);
        setProgress(100);
        setLog("❌ Không đọc được QR – đã lưu Failed", true);

        logGlobal(`⚠️ ${file.name}: không đọc được QR → Failed/`, "error");
        await saveLogEntry({
          user: user.username,
          displayName: user.displayName,
          fileOriginal: file.name,
          path: failedPath,
          status: "FAILED_QR",
          time: timeStr
        });
      } else {
        const safe = qrText.replace(/[^a-zA-Z0-9_-]/g, "_");
        const donePath = `inbox/Done/${safe}.jpg`;

        setProgress(70);
        setLog(`📦 QR: <b>${safe}</b><br>Đang upload vào Done...`);

        await uploadToGitHub(donePath, base64Img, `Upload done image ${safe}.jpg`);
        setProgress(100);
        setLog(`✅ Thành công! Lưu tại: <b>${donePath}</b>`);

        logGlobal(`✔ ${file.name} → ${donePath}`);
        await saveLogEntry({
          user: user.username,
          displayName: user.displayName,
          fileOriginal: file.name,
          qrText: qrText,
          safeName: safe,
          path: donePath,
          status: "DONE",
          time: timeStr
        });
      }
    } catch (err) {
      console.error(err);
      setProgress(100);
      setLog("❌ Lỗi upload lên GitHub", true);
      logGlobal(`❌ ${file.name}: lỗi upload – ${err.message}`, "error");
    }

    doneCount++;
    updateGlobalProgress(doneCount, files.length);
  }

  logGlobal("🎉 Hoàn tất tất cả hình!");
}

// mở thư mục
function openDone() {
  window.open(
    "https://github.com/hoailuan0311-code/ChamCongDashboard/tree/main/inbox/Done",
    "_blank"
  );
}
function openFailed() {
  window.open(
    "https://github.com/hoailuan0311-code/ChamCongDashboard/tree/main/inbox/Failed",
    "_blank"
  );
}
