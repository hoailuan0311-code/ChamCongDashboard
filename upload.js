// =============== CONFIG ===============
const repoUser = "hoailuan0311-code";
const repoName = "ChamCongDashboard";

// 2 biến này được gán từ upload.html
let GITHUB_TOKEN = window.GITHUB_TOKEN || "";
let UPLOAD_USER  = window.UPLOAD_USER  || {};

// =============== DOM SHORTCUTS ===============
const fileListEl = document.getElementById("fileList");
const logsEl     = document.getElementById("logs");
const btnStart   = document.getElementById("btnStart");
const fileInput  = document.getElementById("fileInput");

// =============== HELPER ===============
function log(msg, isError = false) {
  const line = document.createElement("div");
  line.textContent = msg;
  line.style.color = isError ? "#dc2626" : "#111827";
  logsEl.appendChild(line);
  logsEl.scrollTop = logsEl.scrollHeight;
}

function utf8ToBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

async function githubPutFile(path, base64Content, message, sha) {
  const url = `https://api.github.com/repos/${repoUser}/${repoName}/contents/${encodeURIComponent(path)}`;

  const body = {
    message,
    content: base64Content,
    branch: "main"
  };
  if (sha) body.sha = sha;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`PUT ${path} failed: ${res.status} – ${t}`);
  }
  return res.json();
}

async function githubGetFile(path) {
  const url = `https://api.github.com/repos/${repoUser}/${repoName}/contents/${encodeURIComponent(path)}`;
  const res = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json"
    }
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    const t = await res.text();
    throw new Error(`GET ${path} failed: ${res.status} – ${t}`);
  }
  return res.json();
}

// =============== IMAGE TOOLS ===============

// Nén ảnh bằng canvas → trả về base64 (chuỗi, không có prefix data:)
async function compressToBase64(file, maxWidth = 1400, quality = 0.5) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = maxWidth / img.width;
      const canvas = document.createElement("canvas");
      canvas.width = maxWidth;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve(dataUrl.split(",")[1]); // lấy phần base64 sau dấu ,
    };
    img.onerror = () => reject(new Error("Không load được ảnh để nén"));
    img.src = URL.createObjectURL(file);
  });
}

// Decode QR từ góc trên bên phải ảnh
async function decodeQR(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      // crop góc QR (25–30% trên bên phải)
      const cropW = img.width * 0.28;
      const cropH = img.height * 0.28;
      const sx = img.width - cropW;
      const sy = 0;

      const imageData = ctx.getImageData(sx, sy, cropW, cropH);

      const code = jsQR(imageData.data, cropW, cropH);
      resolve(code ? code.data : "");
    };
    img.onerror = () => resolve("");
    img.src = URL.createObjectURL(file);
  });
}

// =============== LOG JSON ===============
async function appendLogEntry(entry) {
  const path = "logs/upload_log.json";
  const existing = await githubGetFile(path);

  let arr = [];
  let sha = null;

  if (existing && existing.content) {
    sha = existing.sha;
    const raw = atob(existing.content.replace(/\n/g, ""));
    arr = JSON.parse(raw);
  }

  arr.push(entry);

  const newContent = utf8ToBase64(JSON.stringify(arr, null, 2));
  await githubPutFile(path, newContent, "Update upload log", sha);
}

// =============== UI ROW ===============
function createRow(fileName) {
  const row = document.createElement("div");
  row.className = "file-row";

  const colName = document.createElement("div");
  colName.textContent = fileName;

  const colStatus = document.createElement("div");
  colStatus.textContent = "Đang chờ...";
  colStatus.className = "status-running";

  const colTime = document.createElement("div");
  colTime.textContent = "-";

  row.appendChild(colName);
  row.appendChild(colStatus);
  row.appendChild(colTime);

  fileListEl.appendChild(row);

  return { row, colStatus, colTime };
}

// =============== MAIN ===============
async function startUpload() {
  if (!UPLOAD_USER || !UPLOAD_USER.username) {
    alert("Chưa đăng nhập (thiếu thông tin user). Vào lại upload_login.html.");
    return;
  }
  if (!GITHUB_TOKEN) {
    alert("Không có GitHub token. Vào lại trang đăng nhập và nhập PAT.");
    return;
  }

  const files = Array.from(fileInput.files || []);
  if (files.length === 0) {
    alert("Chưa chọn hình.");
    return;
  }

  btnStart.disabled = true;
  log(`Bắt đầu xử lý ${files.length} hình...`);

  for (const file of files) {
    const row = createRow(file.name);
    const { colStatus, colTime } = row;

    const start = performance.now();

    try {
      // 1) Decode QR
      colStatus.textContent = "Đang đọc QR...";
      const qrText = await decodeQR(file);

      // 2) Compress
      colStatus.textContent = "Đang nén hình...";
      const base64Image = await compressToBase64(file);

      const cleanQR = qrText ? qrText.replace(/[^0-9A-Za-z_-]/g, "") : "";
      const isOk = !!cleanQR;

      const fileNameFinal = isOk ? `${cleanQR}.jpg` : file.name;
      const folder = isOk ? "inbox/Done/" : "inbox/Failed/";
      const destPath = folder + fileNameFinal;

      // 3) Upload file
      colStatus.textContent = "Đang tải lên GitHub...";
      await githubPutFile(destPath, base64Image, `Upload ${fileNameFinal}`);

      // 4) Ghi log
      await appendLogEntry({
        time: new Date().toISOString(),
        user: UPLOAD_USER.username,
        displayName: UPLOAD_USER.displayName,
        original: file.name,
        savedAs: destPath,
        qr: cleanQR || null,
        status: isOk ? "DONE" : "FAILED_QR"
      });

      // 5) Cập nhật UI
      const elapsed = (performance.now() - start) / 1000;
      colTime.textContent = elapsed.toFixed(1) + "s";

      if (isOk) {
        colStatus.textContent = `✓ QR: ${cleanQR}`;
        colStatus.className = "status-ok";
      } else {
        colStatus.textContent = "✗ Không đọc được QR";
        colStatus.className = "status-fail";
      }

      log(`✔ ${file.name} → ${destPath}`);
    } catch (err) {
      console.error(err);
      colStatus.textContent = "✗ Lỗi upload";
      colStatus.className = "status-fail";
      colTime.textContent = "-";

      log(`✗ Lỗi với file ${file.name}: ${err.message}`, true);
    }
  }

  btnStart.disabled = false;
  log("Hoàn tất xử lý tất cả file.");
}
