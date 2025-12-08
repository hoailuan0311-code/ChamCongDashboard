//----------------------------------------------------------
// CONFIG
//----------------------------------------------------------
const OWNER = "hoailuan0311-code";
const REPO  = "ChamCongDashboard";

const PATH_DONE   = "inbox/Done";
const PATH_FAILED = "inbox/Failed";

let TOKEN = sessionStorage.getItem("session_token");


//----------------------------------------------------------
// START UPLOAD
//----------------------------------------------------------
async function startUpload() {
  const fs = document.getElementById("files").files;
  if (!fs.length) return alert("Chưa chọn file!");

  for (let f of fs) await processFile(f);
}


//----------------------------------------------------------
// PROCESS 1 FILE
//----------------------------------------------------------
async function processFile(file) {
  const row = addRow(file.name, "Đang đọc QR…");

  try {
    const qr = await extractQR(file);

    if (!qr) {
      row.status.innerHTML = "❌ Không đọc được QR → Failed";
      await uploadFailed(file);
      return;
    }

    row.status.innerHTML = "✔ QR: " + qr;

    const blob = await compressImage(file);
    const newName = qr + ".jpg";

    await uploadGithub(PATH_DONE + "/" + newName, blob, "upload done");

    row.status.innerHTML = "✔ Upload thành công";
    row.time.innerText = new Date().toLocaleTimeString();

  } catch (e) {
    console.error(e);
    row.status.innerHTML = "❌ Lỗi xử lý";
    await uploadFailed(file);
  }
}


//----------------------------------------------------------
// ADD ROW
//----------------------------------------------------------
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
    time: tr.querySelector(".tm")
  };
}


//----------------------------------------------------------
// COMPRESS IMAGE
//----------------------------------------------------------
function compressImage(file) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      const MAX = 1600;

      if (w > MAX) { h = h * (MAX / w); w = MAX; }

      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);

      c.toBlob(b => res(b), "image/jpeg", 0.7);
    };
    img.src = URL.createObjectURL(file);
  });
}


//----------------------------------------------------------
// UPLOAD TO GITHUB
//----------------------------------------------------------
async function uploadGithub(path, blob, msg) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;

  const base64 = await blobToBase64(blob);

  const r = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: msg,
      content: base64
    })
  });

  if (!r.ok) throw new Error(await r.text());
}


//----------------------------------------------------------
async function uploadFailed(file) {
  await uploadGithub(PATH_FAILED + "/" + file.name, file, "upload failed");
}


//----------------------------------------------------------
function blobToBase64(b) {
  return new Promise(r => {
    const fr = new FileReader();
    fr.onload = () => r(fr.result.split(",")[1]);
    fr.readAsDataURL(b);
  });
}
