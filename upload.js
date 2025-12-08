//---------------------------------------------------
//  CONFIG
//---------------------------------------------------
const REPO_OWNER = "hoailuan0311-code";
const REPO_NAME  = "ChamCongDashboard";

const PATH_DONE   = "inbox/Done";
const PATH_FAILED = "inbox/Failed";
const LOG_FILE    = "logs/log.json";

let ghToken = null;


//---------------------------------------------------
//  KIỂM TRA LOGIN (sessionStorage per tab)
//---------------------------------------------------
(function initLogin() {
  const user  = sessionStorage.getItem("session_user");
  const token = sessionStorage.getItem("session_token");

  if (!user || !token) {
    window.location.href = "upload_login.html";
    return;
  }

  const nameSpan = document.getElementById("username");
  if (nameSpan) nameSpan.innerText = user;

  ghToken = token;
})();

function logout() {
  sessionStorage.removeItem("session_user");
  sessionStorage.removeItem("session_token");
  window.location.href = "upload_login.html";
}


//---------------------------------------------------
//  START UPLOAD
//---------------------------------------------------
async function startUpload() {
  const files = document.getElementById("files").files;

  if (!files.length) {
    alert("Chưa chọn hình!");
    return;
  }

  for (const file of files) {
    // chạy tuần tự để dễ theo dõi; muốn nhanh có thể Promise.all
    await processFile(file);
  }
}


//---------------------------------------------------
//  XỬ LÝ 1 FILE
//---------------------------------------------------
async function processFile(file) {
  const row = addRow(file.name, "Đang xử lý…", "status-wait");

  try {
    // 1) Decode QR (bắt buộc phải ra)
    const qr = await extractQR(file);

    if (!qr) {
      row.status.innerText = "❌ Không đọc được QR → Failed";
      row.status.className = "st status-fail";
      await uploadFailed(file);
      return;
    }

    row.status.innerText = `QR: ${qr}`;

    // 2) Load image để nén
    const img = await loadImage(file);

    // 3) Nén ảnh
    const compressed = await compressImage(img);

    // 4) Upload Done với tên QR.jpg
    const newName = `${qr}.jpg`;
    await uploadDone(compressed, newName);

    row.status.innerText = "✔ Thành công";
    row.status.className = "st status-ok";
    row.time.innerText   = new Date().toLocaleTimeString();

    // 5) Ghi log
    await writeLog({
      user: sessionStorage.getItem("session_user"),
      file: newName,
      time: Date.now(),
      qr
    });

  } catch (err) {
    console.error(err);
    row.status.innerText = "❌ Lỗi xử lý";
    row.status.className = "st status-fail";
    await uploadFailed(file);
  }
}


//---------------------------------------------------
//  UI — ADD ROW
//---------------------------------------------------
function addRow(name, status, cls) {
  const tbody = document.getElementById("fileTable");
  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td>${name}</td>
    <td class="st ${cls || ""}">${status}</td>
    <td class="tm">—</td>
  `;

  tbody.appendChild(tr);

  return {
    status: tr.querySelector(".st"),
    time: tr.querySelector(".tm")
  };
}


//---------------------------------------------------
//  LOAD IMAGE
//---------------------------------------------------
function loadImage(file) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = URL.createObjectURL(file);
  });
}


//---------------------------------------------------
//  NÉN ẢNH – 1600px max cạnh dài, chất lượng ~0.65
//---------------------------------------------------
function compressImage(img) {
  return new Promise(resolve => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const MAX = 1600;
    let w = img.width;
    let h = img.height;

    if (w > MAX) {
      h = h * (MAX / w);
      w = MAX;
    }

    canvas.width  = w;
    canvas.height = h;

    ctx.drawImage(img, 0, 0, w, h);

    canvas.toBlob(
      (blob) => resolve(blob),
      "image/jpeg",
      0.65
    );
  });
}


//---------------------------------------------------
//  UPLOAD DONE
//---------------------------------------------------
async function uploadDone(blob, filename) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${PATH_DONE}/${filename}`;
  const base64 = await blobToBase64(blob);

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${ghToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: `Upload ${filename}`,
      content: base64
    })
  });

  if (!res.ok) {
    throw new Error("Upload Done failed: " + await res.text());
  }
}


//---------------------------------------------------
//  UPLOAD FAILED (giữ tên gốc)
//---------------------------------------------------
async function uploadFailed(file) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${PATH_FAILED}/${file.name}`;
  const base64 = await blobToBase64(file);

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${ghToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: `Failed ${file.name}`,
      content: base64
    })
  });

  if (!res.ok) {
    console.error("Upload Failed error: ", await res.text());
  }
}


//---------------------------------------------------
//  WRITE LOG JSON
//---------------------------------------------------
async function writeLog(entry) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${LOG_FILE}`;

  let old = "[]";
  let sha = null;

  let res = await fetch(url, {
    headers: { "Authorization": `Bearer ${ghToken}` }
  });

  if (res.status === 200) {
    const js = await res.json();
    sha  = js.sha;
    old  = atob(js.content);
  }

  let arr = [];
  try { arr = JSON.parse(old); } catch {}

  arr.push(entry);

  const putRes = await fetch(url, {
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

  if (!putRes.ok) {
    console.error("Write log error:", await putRes.text());
  }
}


//---------------------------------------------------
//  UTIL
//---------------------------------------------------
function blobToBase64(blob) {
  return new Promise(resolve => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(",")[1]);
    r.readAsDataURL(blob);
  });
}
