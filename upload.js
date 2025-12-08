// upload.js – V16 Turbo + log
//--------------------------------------------------
// CONFIG
//--------------------------------------------------
const REPO_OWNER = "hoailuan0311-code";
const REPO_NAME  = "ChamCongDashboard";

const PATH_DONE   = "inbox/Done";
const PATH_FAILED = "inbox/Failed";
const LOG_FILE    = "logs/log.json";

let ghToken = null;
let currentUser = null;

//--------------------------------------------------
// Session check (sessionStorage – theo login mới)
//--------------------------------------------------
(function () {
  const u = sessionStorage.getItem("session_user");
  const t = sessionStorage.getItem("session_token");

  if (!u || !t) {
    window.location.href = "upload_login.html";
    return;
  }

  currentUser = u;
  ghToken = t;

  console.log("SESSION OK:", u);
})();

function logout() {
  sessionStorage.removeItem("session_user");
  sessionStorage.removeItem("session_token");
  window.location.href = "upload_login.html";
}

//--------------------------------------------------
// UI helper
//--------------------------------------------------
function addRow(name, statusText) {
  const tbody = document.getElementById("fileTable");
  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td>${name}</td>
    <td class="st">${statusText}</td>
    <td class="tm">—</td>
  `;

  tbody.appendChild(tr);
  return {
    row: tr,
    status: tr.querySelector(".st"),
    time: tr.querySelector(".tm")
  };
}

//--------------------------------------------------
// START – chạy nhiều file song song (4 luồng)
//--------------------------------------------------
async function startUpload() {
  const input = document.getElementById("files");
  const files = Array.from(input.files || []);

  if (!files.length) {
    alert("Chưa chọn file!");
    return;
  }

  const cropView = document.getElementById("cropView");

  // Tạo row trước
  const tasks = files.map((f) => ({
    file: f,
    ui: addRow(f.name, "Đang xử lý…"),
    canvas: cropView
  }));

  const CONCURRENCY = 4;
  let idx = 0;

  async function workerLoop() {
    while (idx < tasks.length) {
      const myIndex = idx++;
      const task = tasks[myIndex];
      await processFile(task.file, task.ui, task.canvas);
    }
  }

  const runners = [];
  for (let i = 0; i < Math.min(CONCURRENCY, tasks.length); i++) {
    runners.push(workerLoop());
  }

  await Promise.all(runners);
  alert("Xong tất cả file.");
}

//--------------------------------------------------
// Process 1 file
//--------------------------------------------------
async function processFile(file, ui, previewCanvas) {
  try {
    ui.status.textContent = "Đang đọc QR / ASN…";

    const info = await extractCode(file, previewCanvas);

    if (!info) {
      ui.status.textContent = "❌ Không đọc được QR/ASN → Failed";
      await uploadFailed(file);
      return;
    }

    const code = info.code;
    const label =
      info.type === "QR"
        ? `QR: ${code}`
        : `ASN: ${code} (fallback)`;

    ui.status.textContent = label + " → Upload…";

    // Nén hình
    const compressed = await compressImage(file);
    const newName = `${code}.jpg`;

    // Upload vào Done
    await uploadGitHub(`${PATH_DONE}/${newName}`, compressed, `Upload ${newName}`);

    ui.status.textContent = label + " → Upload OK";
    ui.time.textContent = new Date().toLocaleTimeString();

    // Ghi log
    await writeLog({
      user: currentUser,
      file: newName,
      type: info.type,
      code,
      ts: Date.now()
    });
  } catch (e) {
    console.error("processFile error:", e);
    ui.status.textContent = "❌ Lỗi xử lý → Failed";
    await uploadFailed(file);
  }
}

//--------------------------------------------------
// Compress image ~ 900px, quality 0.7
//--------------------------------------------------
function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width;
      let h = img.height;
      const MAX = 1600;

      if (w > MAX) {
        h = (h * MAX) / w;
        w = MAX;
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => resolve(blob),
        "image/jpeg",
        0.7
      );
    };
    img.src = URL.createObjectURL(file);
  });
}

//--------------------------------------------------
// GitHub helpers
//--------------------------------------------------
async function uploadGitHub(path, blob, message) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;
  const content = await blobToBase64(blob);

  const headers = {
    Authorization: `Bearer ${ghToken}`,
    "Content-Type": "application/json"
  };

  // kiểm tra tồn tại để lấy sha (tránh lỗi 422)
  let sha = null;
  let res = await fetch(url, { headers: { Authorization: `Bearer ${ghToken}` } });
  if (res.status === 200) {
    const js = await res.json();
    sha = js.sha;
  }

  res = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify({ message, content, sha })
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error("UploadGitHub failed: " + t);
  }
}

async function uploadFailed(file) {
  const path = `${PATH_FAILED}/${file.name}`;
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;
  const content = await blobToBase64(file);

  const headers = {
    Authorization: `Bearer ${ghToken}`,
    "Content-Type": "application/json"
  };

  // không cần sha, thường Failed không trùng tên
  const res = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: `Failed ${file.name}`,
      content
    })
  });

  if (!res.ok) {
    console.warn("UploadFailed error:", await res.text());
  }
}

//--------------------------------------------------
// Log JSON
//--------------------------------------------------
async function writeLog(entry) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${LOG_FILE}`;

  const headers = {
    Authorization: `Bearer ${ghToken}`,
    "Content-Type": "application/json"
  };

  let old = "[]";
  let sha = null;

  let res = await fetch(url, { headers: { Authorization: `Bearer ${ghToken}` } });
  if (res.status === 200) {
    const js = await res.json();
    old = atob(js.content);
    sha = js.sha;
  }

  let arr = [];
  try {
    arr = JSON.parse(old);
  } catch {
    arr = [];
  }

  arr.push(entry);

  res = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: "Update log",
      content: btoa(JSON.stringify(arr, null, 2)),
      sha
    })
  });

  if (!res.ok) {
    console.warn("writeLog error:", await res.text());
  }
}

//--------------------------------------------------
// Utils
//--------------------------------------------------
function blobToBase64(blob) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => {
      const base64 = r.result.split(",")[1];
      resolve(base64);
    };
    r.readAsDataURL(blob);
  });
}
