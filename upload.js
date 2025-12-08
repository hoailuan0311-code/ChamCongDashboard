//--------------------------------------------------
// upload.js – V17 Sync with decodeQRSmart()
//--------------------------------------------------
const REPO_OWNER = "hoailuan0311-code";
const REPO_NAME  = "ChamCongDashboard";

const PATH_DONE   = "inbox/Done";
const PATH_FAILED = "inbox/Failed";
const LOG_FILE    = "logs/log.json";

let ghToken = null;
let currentUser = null;

//--------------------------------------------------
// Session check
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

  const cropPreview = document.getElementById("cropPreview");

  const tasks = files.map((f) => ({
    file: f,
    ui: addRow(f.name, "Đang xử lý…"),
    preview: cropPreview
  }));

  const CONCURRENCY = 4;
  let idx = 0;

  async function workerLoop() {
    while (idx < tasks.length) {
      const myIndex = idx++;
      const task = tasks[myIndex];
      await processFile(task.file, task.ui, task.preview);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, () =>
      workerLoop()
    )
  );

  alert("Xong tất cả file.");
}

//--------------------------------------------------
// Process 1 file – V17 AI QR decode
//--------------------------------------------------
async function processFile(file, ui, previewImg) {
  try {
    ui.status.textContent = "Đang đọc QR / ASN…";

    // ===============================
    // ⭐ decodeQRSmart() — V17 AI
    // ===============================
    let result;
    try {
      result = await decodeQRSmart(file, previewImg);
    } catch (err) {
      console.error("decodeQRSmart error:", err);
      ui.status.textContent = "❌ Lỗi xử lý → Failed";
      await uploadFailed(file);
      return;
    }

    if (!result || !result.ok) {
      ui.status.textContent = "❌ Không đọc được QR/ASN → Failed";
      await uploadFailed(file);
      return;
    }

    const code = result.value;
    const label =
      result.source === "qr"
        ? `QR: ${code}`
        : `ASN: ${code} (fallback)`;

    ui.status.textContent = label + " → Upload…";

    // ===============================
    // Nén hình (1600px)
    // ===============================
    const compressed = await compressImage(file);
    const newName = `${code}.jpg`;

    // ===============================
    // Upload vào folder Done
    // ===============================
    await uploadGitHub(`${PATH_DONE}/${newName}`, compressed, `Upload ${newName}`);

    ui.status.textContent = label + " → Upload OK";
    ui.time.textContent = new Date().toLocaleTimeString();

    // ===============================
    // Ghi log JSON
    // ===============================
    await writeLog({
      user: currentUser,
      file: newName,
      type: result.source,
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
// Compress image ~ 1600px
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

      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.75);
    };
    img.src = URL.createObjectURL(file);
  });
}

//--------------------------------------------------
// Upload GitHub (PUT) + sha protection
//--------------------------------------------------
async function uploadGitHub(path, blob, message) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;
  const content = await blobToBase64(blob);

  const headers = {
    Authorization: `Bearer ${ghToken}`,
    "Content-Type": "application/json"
  };

  // LẤY SHA TRƯỚC KHI PUT
  let sha = null;
  let r1 = await fetch(url, {
    headers: { Authorization: `Bearer ${ghToken}` }
  });

  if (r1.status === 200) {
    const j = await r1.json();
    sha = j.sha;
  }

  const r2 = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify({ message, content, sha })
  });

  if (!r2.ok) {
    throw new Error("UploadGitHub failed: " + (await r2.text()));
  }
}

//--------------------------------------------------
// Upload Failed file
//--------------------------------------------------
async function uploadFailed(file) {
  const path = `${PATH_FAILED}/${file.name}`;
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;
  const content = await blobToBase64(file);

  const headers = {
    Authorization: `Bearer ${ghToken}`,
    "Content-Type": "application/json"
  };

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
// LOG JSON update
//--------------------------------------------------
async function writeLog(entry) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${LOG_FILE}`;

  const headers = {
    Authorization: `Bearer ${ghToken}`,
    "Content-Type": "application/json"
  };

  let old = "[]";
  let sha = null;

  let r1 = await fetch(url, {
    headers: { Authorization: `Bearer ${ghToken}` }
  });

  if (r1.status === 200) {
    const js = await r1.json();
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

  const r2 = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: "Update log",
      content: btoa(JSON.stringify(arr, null, 2)),
      sha
    })
  });

  if (!r2.ok) {
    console.warn("writeLog error:", await r2.text());
  }
}

//--------------------------------------------------
// Utils
//--------------------------------------------------
function blobToBase64(blob) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(",")[1]);
    r.readAsDataURL(blob);
  });
}
