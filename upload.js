//---------------------------------------------------
//  CONFIG - dùng đúng 1 lần, không trùng biến nữa
//---------------------------------------------------
const REPO_OWNER = "hoailuan0311-code";
const REPO_NAME  = "ChamCongDashboard";

// nơi lưu ảnh sau upload
const DONE_PATH   = "inbox/Done";
const FAILED_PATH = "inbox/Failed";

// file log chung
const LOG_FILE = "logs/log.json";

let ghToken = null;


//---------------------------------------------------
//  Kiểm tra login
//---------------------------------------------------
(function checkLogin() {
  const sess = localStorage.getItem("session_user");
  const token = localStorage.getItem("session_token");

  if (!sess || !token) {
    window.location.href = "upload_login.html";
    return;
  }

  document.getElementById("username").innerText = `Xin chào ${sess}!`;
  ghToken = token;
})();

function logout() {
  localStorage.removeItem("session_user");
  localStorage.removeItem("session_token");
  window.location.href = "upload_login.html";
}


//---------------------------------------------------
//  Tải file → đọc QR → nén → upload
//---------------------------------------------------
async function startUpload() {
  const files = document.getElementById("files").files;
  if (!files.length) return alert("Chưa chọn file!");

  for (const f of files) {
    await handleFile(f);
  }
}


//---------------------------------------------------
async function handleFile(file) {
  const row = addRow(file.name, "Đang xử lý…");

  try {
    // 1) Đọc QR
    const qr = await extractQR(file);
    if (!qr) {
      row.status.innerText = "❌ Không đọc được QR → Failed";
      await uploadFailed(file);
      return;
    }

    row.status.innerText = `QR: ${qr}`;

    // 2) Nén ảnh
    const compressed = await compressImage(file);

    // 3) Upload lên GitHub → tên chuẩn {QR}.jpg
    const newName = `${qr}.jpg`;
    await uploadToGitHub(compressed, newName);

    row.status.innerText = "✔ Thành công";
    row.time.innerText = new Date().toLocaleTimeString();

    await writeLog({
      user: localStorage.getItem("session_user"),
      file: newName,
      time: Date.now(),
      qr
    });

  } catch (e) {
    console.error(e);
    row.status.innerText = "❌ Lỗi";
    await uploadFailed(file);
  }
}


//---------------------------------------------------
//  Thêm dòng vào bảng
//---------------------------------------------------
function addRow(name, status) {
  const tb = document.getElementById("fileTable");
  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td>${name}</td>
    <td class="st">${status}</td>
    <td class="tm">—</td>
  `;

  tb.appendChild(tr);

  return {
    status: tr.querySelector(".st"),
    time:   tr.querySelector(".tm")
  };
}


//---------------------------------------------------
// Upload file vào thư mục Done
//---------------------------------------------------
async function uploadToGitHub(blob, filename) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DONE_PATH}/${filename}`;

  const content = await blobToBase64(blob);

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${ghToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: `Upload ${filename}`,
      content: content
    })
  });

  if (!res.ok) throw new Error("Upload failed: " + await res.text());
}


//---------------------------------------------------
// Upload vào Failed nếu không đọc được QR
//---------------------------------------------------
async function uploadFailed(file) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FAILED_PATH}/${file.name}`;

  const content = await blobToBase64(file);

  await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${ghToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: `Failed ${file.name}`,
      content
    })
  });
}


//---------------------------------------------------
//  Ghi log JSON vào logs/log.json
//---------------------------------------------------
async function writeLog(entry) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${LOG_FILE}`;

  // lấy file log
  let old = "";
  let sha = null;

  let res = await fetch(url, {
    headers: { "Authorization": `Bearer ${ghToken}` }
  });

  if (res.status === 200) {
    const json = await res.json();
    old = atob(json.content);
    sha = json.sha;
  }

  let arr = [];
  try { arr = JSON.parse(old) } catch {}

  arr.push(entry);

  // ghi lại
  await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${ghToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "Update log",
      content: btoa(JSON.stringify(arr, null, 2)),
      sha
    })
  });
}


//---------------------------------------------------
// UTIL
//---------------------------------------------------
function blobToBase64(blob) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(",")[1]);
    r.readAsDataURL(blob);
  });
}

// compress ảnh 1MB → 300–400KB
function compressImage(file) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");

      const MAX = 1600;
      let w = img.width;
      let h = img.height;

      if (w > MAX) { h *= MAX / w; w = MAX; }
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(b => resolve(b), "image/jpeg", 0.6);
    };
    img.src = URL.createObjectURL(file);
  });
}

// dùng thư viện qr.js trong repo
async function extractQR(file) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const code = jsQR(
        ctx.getImageData(0, 0, canvas.width, canvas.height).data,
        canvas.width,
        canvas.height
      );
      resolve(code ? code.data : null);
    };
    img.src = URL.createObjectURL(file);
  });
}
