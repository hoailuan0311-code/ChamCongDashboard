//------------------------------------------------------------
// CONFIG
//------------------------------------------------------------
const REPO_OWNER = "hoailuan0311-code";
const REPO_NAME  = "ChamCongDashboard";

const PATH_DONE   = "inbox/Done";
const PATH_FAILED = "inbox/Failed";
const LOG_FILE    = "logs/log.json";

let ghToken = null;


//------------------------------------------------------------
// LOGIN CHECK
//------------------------------------------------------------
(function () {
  const page = location.pathname.split("/").pop();
  const u = localStorage.getItem("session_user");
  const t = localStorage.getItem("session_token");

  console.log("SESSION CHECK:", u, t);

  if (page === "upload.html") {
    if (!u) {
      location.href = "upload_login.html";
      return;
    }
    document.getElementById("username").innerText = `Xin chào ${u}`;
    ghToken = t;
  }
})();


//------------------------------------------------------------
// START UPLOAD
//------------------------------------------------------------
async function startUpload() {
  const files = document.getElementById("files").files;
  if (!files.length) return alert("Chưa chọn file!");

  for (const f of files) await processFile(f);
}


//------------------------------------------------------------
// PROCESS 1 FILE
//------------------------------------------------------------
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

    row.status.innerHTML = "✔ Hoàn tất";
    row.time.innerText = new Date().toLocaleTimeString();

    await writeLog({
      user: localStorage.getItem("session_user"),
      qr,
      file: newName,
      ts: Date.now(),
    });

  } catch (e) {
    console.error(e);
    row.status.innerHTML = "❌ Lỗi xử lý";
    await uploadFailed(file);
  }
}


//------------------------------------------------------------
// ADD ROW
//------------------------------------------------------------
function addRow(name, st) {
  const tb = document.getElementById("fileTable");
  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td>${name}</td>
    <td class="st">${st}</td>
    <td class="tm">—</td>
  `;

  tb.appendChild(tr);
  return { status: tr.querySelector(".st"), time: tr.querySelector(".tm") };
}


//------------------------------------------------------------
// COMPRESS IMAGE
//------------------------------------------------------------
function compressImage(file) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1600;
      let w = img.width, h = img.height;
      if (w > MAX) { h *= MAX / w; w = MAX; }

      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);

      c.toBlob(b => res(b), "image/jpeg", 0.7);
    };
    img.src = URL.createObjectURL(file);
  });
}


//------------------------------------------------------------
// UPLOAD DONE
//------------------------------------------------------------
async function uploadDone(blob, filename) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${PATH_DONE}/${filename}`;
  const base64 = await toBase64(blob);

  const rs = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${ghToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: "upload done",
      content: base64,
    }),
  });

  if (!rs.ok) throw new Error(await rs.text());
}


//------------------------------------------------------------
// UPLOAD FAILED
//------------------------------------------------------------
async function uploadFailed(file) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${PATH_FAILED}/${file.name}`;
  const base64 = await toBase64(file);

  await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${ghToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: "failed",
      content: base64,
    }),
  });
}


//------------------------------------------------------------
// LOG
//------------------------------------------------------------
async function writeLog(entry) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${LOG_FILE}`;
  let old = "[]", sha = null;

  const rs = await fetch(url, { headers: { Authorization: `Bearer ${ghToken}` } });

  if (rs.status === 200) {
    const js = await rs.json();
    sha = js.sha;
    old = atob(js.content);
  }

  const arr = JSON.parse(old);
  arr.push(entry);

  await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${ghToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: "log update",
      content: btoa(JSON.stringify(arr, null, 2)),
      sha,
    }),
  });
}


//------------------------------------------------------------
// UTIL
//------------------------------------------------------------
function toBase64(blob) {
  return new Promise(r => {
    const fr = new FileReader();
    fr.onload = () => r(fr.result.split(",")[1]);
    fr.readAsDataURL(blob);
  });
}
