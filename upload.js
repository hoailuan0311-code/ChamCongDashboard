// =============================================
// CONFIG
// =============================================
const REPO_OWNER = "hoailuan0311-code";
const REPO_NAME  = "ChamCongDashboard";

const PATH_DONE   = "inbox/Done";
const PATH_FAILED = "inbox/Failed";
const LOG_FILE    = "logs/log.json";

let ghToken = null;


// =============================================
// CHECK SESSION — sessionStorage ONLY
// =============================================
(function () {
  const page = location.pathname.split("/").pop();

  const u = sessionStorage.getItem("session_user");
  const t = sessionStorage.getItem("session_token");

  if (page === "upload") {
    if (!u || !t) {
      location.href = "upload_login.html";
      return;
    }
    document.getElementById("username").textContent = "Xin chào " + u;
    ghToken = t;
  }
})();

function logout() {
  sessionStorage.removeItem("session_user");
  sessionStorage.removeItem("session_token");
  location.href = "upload_login.html";
}


// =============================================
// START UPLOAD
// =============================================
async function startUpload() {
  const files = document.getElementById("files").files;
  if (!files.length) return alert("Chưa chọn file!");

  for (const file of files) {
    await processFile(file);
  }
}


// =============================================
// PROCESS ONE FILE
// =============================================
async function processFile(file) {
  const row = addRow(file.name, "Đang đọc QR…");

  try {
    const qr = await extractQR(file);

    if (!qr) {
      row.status.innerHTML = "❌ Không đọc được QR → Failed";
      await uploadFailed(file);
      return;
    }

    row.status.innerHTML = `✔ QR: ${qr}`;

    const compressed = await compressImage(file);
    const newName = `${qr}.jpg`;
    await uploadDone(compressed, newName);

    row.status.innerHTML = "✔ Thành công";
    row.time.textContent = new Date().toLocaleTimeString();

    await writeLog({
      user: sessionStorage.getItem("session_user"),
      qr,
      file: newName,
      time: Date.now()
    });

  } catch (err) {
    console.error(err);
    row.status.innerHTML = "❌ Lỗi xử lý file";
    await uploadFailed(file);
  }
}


// =============================================
// TABLE ROW
// =============================================
function addRow(name, st) {
  const tb = document.getElementById("fileTable");
  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td>${name}</td>
    <td class="st">${st}</td>
    <td class="tm">—</td>
  `;

  tb.appendChild(tr);
  return {
    status: tr.querySelector(".st"),
    time:   tr.querySelector(".tm")
  };
}


// =============================================
// COMPRESS IMAGE
// =============================================
function compressImage(file) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      const MAX = 1600;

      if (w > MAX) { h *= MAX / w; w = MAX; }

      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);

      c.toBlob(b => res(b), "image/jpeg", 0.70);
    };

    img.src = URL.createObjectURL(file);
  });
}


// =============================================
// UPLOAD DONE → GitHub
// =============================================
async function uploadDone(blob, filename) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${PATH_DONE}/${filename}`;

  const base64 = await toBase64(blob);

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${ghToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "upload done",
      content: base64
    })
  });

  if (!res.ok) throw new Error(await res.text());
}


// =============================================
// UPLOAD FAILED
// =============================================
async function uploadFailed(file) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${PATH_FAILED}/${file.name}`;

  const base64 = await toBase64(file);

  await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${ghToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "upload failed",
      content: base64
    })
  });
}


// =============================================
// WRITE LOG
// =============================================
async function writeLog(entry) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${LOG_FILE}`;

  let old = "[]";
  let sha = null;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${ghToken}` }
  });

  if (res.status === 200) {
    const js = await res.json();
    sha = js.sha;
    old = atob(js.content);
  }

  const arr = JSON.parse(old);
  arr.push(entry);

  await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${ghToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "update log",
      content: btoa(JSON.stringify(arr, null, 2)),
      sha
    })
  });
}


// =============================================
// UTIL
// =============================================
function toBase64(blob) {
  return new Promise(res => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.readAsDataURL(blob);
  });
}
