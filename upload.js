/****************************************************
 * UPLOAD ENGINE V14 – QR + ASN + SAFE GITHUB PUT
 ****************************************************/

// ====== CONFIG REPO ======
const REPO_OWNER = "hoailuan0311-code";
const REPO_NAME  = "ChamCongDashboard";

const PATH_DONE   = "inbox/Done";
const PATH_FAILED = "inbox/Failed";
const LOG_FILE    = "logs/log.json";

let GH_TOKEN = null;
let CUR_USER = null;

// ====== INIT SESSION (chỉ chạy trên upload.html) ======
(function initSession() {
  const page = location.pathname.split("/").pop().toLowerCase();
  if (page !== "upload.html") return;

  const u = sessionStorage.getItem("session_user");
  const t = sessionStorage.getItem("session_token");

  console.log("SESSION CHECK:", u);

  if (!u || !t) {
    // chưa login → đá về login
    location.href = "upload_login.html";
    return;
  }

  CUR_USER = u;
  GH_TOKEN = t;

  // gắn tên user lên UI nếu có chỗ hiển thị
  const box =
    document.getElementById("userBox") ||
    document.getElementById("userName") ||
    document.querySelector("[data-user-name]");

  if (box) {
    box.textContent = u;
  }
})();

// ====== LOGOUT CHO NÚT onclick="logout()" ======
function logout() {
  sessionStorage.removeItem("session_user");
  sessionStorage.removeItem("session_token");
  location.href = "upload_login.html";
}

/****************************************************
 * ENTRY – BẮT ĐẦU UPLOAD
 ****************************************************/
async function startUpload() {
  const input = document.getElementById("files");
  if (!input || !input.files || !input.files.length) {
    alert("Chưa chọn hình!");
    return;
  }

  const files = Array.from(input.files);
  if (files.length > 100) {
    alert("Giới hạn tối đa 100 hình/lần.");
    return;
  }

  for (const f of files) {
    // chạy tuần tự cho chắc
    // (muốn nhanh hơn có thể chạy Promise.all sau)
    /* eslint-disable no-await-in-loop */
    await processFile(f);
    /* eslint-enable no-await-in-loop */
  }
}

/****************************************************
 * XỬ LÝ 1 FILE
 ****************************************************/
async function processFile(file) {
  const row = addRow(file.name, "Đang giải mã QR…");
  const previewCanvas = document.getElementById("cropView");

  let result = null;

  try {
    // extractCode được định nghĩa trong qr.js V14
    result = await extractCode(file, previewCanvas);
  } catch (err) {
    console.error("Decode error:", err);
    row.status.innerHTML = "❌ Lỗi giải mã QR/ASN";
    await safeFailed(file, "DECODE_ERROR");
    await writeLog({
      ts: Date.now(),
      user: CUR_USER,
      srcName: file.name,
      storedName: null,
      mode: "DECODE_ERROR",
      code: null,
      result: "FAILED"
    });
    return;
  }

  if (!result) {
    row.status.innerHTML = "❌ Không đọc được QR / ASN → Failed";
    await safeFailed(file, "NO_CODE");
    await writeLog({
      ts: Date.now(),
      user: CUR_USER,
      srcName: file.name,
      storedName: null,
      mode: "NO_CODE",
      code: null,
      result: "FAILED"
    });
    return;
  }

  const { type, code } = result; // type: "QR" | "ASN"
  if (type === "QR") {
    row.status.textContent = `QR: ${code}`;
  } else {
    row.status.textContent = `ASN: ${code} (fallback)`;
  }

  // nén ảnh
  let compressed;
  try {
    compressed = await compressImage(file);
  } catch (err) {
    console.error("Compress error:", err);
    row.status.innerHTML = "❌ Lỗi nén ảnh → Failed";
    await safeFailed(file, "COMPRESS_ERROR");
    await writeLog({
      ts: Date.now(),
      user: CUR_USER,
      srcName: file.name,
      storedName: null,
      mode: "COMPRESS_ERROR",
      code,
      result: "FAILED"
    });
    return;
  }

  const newName = `${code}.jpg`;

  // upload vào thư mục Done
  try {
    await uploadDone(compressed, newName);

    row.status.textContent += " → Upload OK";
    row.time.textContent = new Date().toLocaleTimeString();

    await writeLog({
      ts: Date.now(),
      user: CUR_USER,
      srcName: file.name,
      storedName: newName,
      mode: type,        // "QR" hoặc "ASN"
      code,
      result: "DONE"
    });
  } catch (err) {
    console.error("Upload Done error:", err);
    row.status.innerHTML = "❌ Lỗi upload → chuyển Failed";

    await safeFailed(file, "UPLOAD_ERROR");

    await writeLog({
      ts: Date.now(),
      user: CUR_USER,
      srcName: file.name,
      storedName: newName,
      mode: "UPLOAD_ERROR",
      code,
      result: "FAILED"
    });
  }
}

/****************************************************
 * UI – THÊM DÒNG VÀO BẢNG
 ****************************************************/
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

/****************************************************
 * NÉN ẢNH – GIẢM KÍCH THƯỚC + CHẤT LƯỢNG
 ****************************************************/
function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1600;
      let w = img.width;
      let h = img.height;

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

/****************************************************
 * GITHUB UPLOAD – SAFE (GET SHA TRƯỚC)
 ****************************************************/
async function uploadGithub(path, base64Content, message) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;

  // 1) GET để lấy SHA nếu file đã tồn tại
  let sha = null;
  const getRes = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: "application/vnd.github+json"
    }
  });

  if (getRes.status === 200) {
    const js = await getRes.json();
    sha = js.sha;
  } else if (getRes.status !== 404) {
    const txt = await getRes.text();
    throw new Error(`GET before PUT failed: ${getRes.status} – ${txt}`);
  }

  // 2) PUT với/không với SHA
  const body = { message, content: base64Content };
  if (sha) body.sha = sha;

  const putRes = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!putRes.ok) {
    const txt = await putRes.text();
    throw new Error(`PUT failed: ${putRes.status} – ${txt}`);
  }

  return putRes.json();
}

// Upload thành công → PATH_DONE
async function uploadDone(blob, filename) {
  const base64 = await blobToBase64(blob);
  const path = `${PATH_DONE}/${filename}`;
  return uploadGithub(path, base64, `upload done ${filename}`);
}

// Upload fail → PATH_FAILED (giữ nguyên tên gốc)
async function safeFailed(file, reason) {
  try {
    const base64 = await blobToBase64(file);
    const path = `${PATH_FAILED}/${file.name}`;
    await uploadGithub(path, base64, `upload failed (${reason}) ${file.name}`);
  } catch (err) {
    console.warn("Upload Failed folder error:", err);
  }
}

/****************************************************
 * LOG – GHI VÀO logs/log.json
 ****************************************************/
async function writeLog(entry) {
  const path = LOG_FILE;
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;

  let oldJson = "[]";
  let sha = null;

  const getRes = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: "application/vnd.github+json"
    }
  });

  if (getRes.status === 200) {
    const js = await getRes.json();
    sha = js.sha;
    oldJson = atob(js.content);
  } else if (getRes.status !== 404) {
    console.warn("GET log.json error:", getRes.status);
  }

  let arr = [];
  try {
    arr = JSON.parse(oldJson);
    if (!Array.isArray(arr)) arr = [];
  } catch {
    arr = [];
  }

  arr.push(entry);

  const newContent = btoa(JSON.stringify(arr, null, 2));

  const body = { message: "update upload log", content: newContent };
  if (sha) body.sha = sha;

  const putRes = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!putRes.ok) {
    console.warn("PUT log.json error:", putRes.status, await putRes.text());
  }
}

/****************************************************
 * UTIL – BINARY → BASE64
 ****************************************************/
function blobToBase64(blob) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(",")[1]);
    r.readAsDataURL(blob);
  });
}
