const USERS_URL = "users.json";
const REPO_OWNER = "hoailuan0311-code";
const REPO_NAME  = "ChamCongDashboard";

const loginView  = document.getElementById("loginView");
const uploadView = document.getElementById("uploadView");

const usernameEl = document.getElementById("username");
const passwordEl = document.getElementById("password");
const tokenEl    = document.getElementById("token");
const loginErrEl = document.getElementById("loginError");

const helloUser  = document.getElementById("helloUser");
const fileInput  = document.getElementById("fileInput");
const fileListEl = document.getElementById("fileList");
const logsEl     = document.getElementById("logs");
const btnLogin   = document.getElementById("btnLogin");
const btnStart   = document.getElementById("btnStart");
const btnLogout  = document.getElementById("btnLogout");

// ========== SESSION HANDLING (auto logout khi đóng tab) ==========
function getSession() {
  try {
    const raw = sessionStorage.getItem("dn_session");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function setSession(obj) {
  sessionStorage.setItem("dn_session", JSON.stringify(obj));
}
function clearSession() {
  sessionStorage.removeItem("dn_session");
}

// ========== INIT ==========
(function init() {
  const sess = getSession();
  if (sess && sess.user && sess.token) {
    showUploadView(sess.user);
  } else {
    showLoginView();
  }
})();

function showLoginView() {
  loginView.style.display  = "block";
  uploadView.style.display = "none";
}
function showUploadView(user) {
  loginView.style.display  = "none";
  uploadView.style.display = "block";
  helloUser.textContent = `Xin chào ${user}!`;
}

// ========== LOG UI ==========
function log(msg, isErr = false) {
  const line = document.createElement("div");
  line.textContent = msg;
  line.style.color = isErr ? "#dc2626" : "#111827";
  logsEl.appendChild(line);
  logsEl.scrollTop = logsEl.scrollHeight;
}

// ========== LOGIN ==========
btnLogin.addEventListener("click", async () => {
  loginErrEl.textContent = "";
  const user = usernameEl.value.trim();
  const pass = passwordEl.value.trim();
  const token = tokenEl.value.trim();

  if (!user || !pass || !token) {
    loginErrEl.textContent = "Vui lòng nhập đầy đủ user, password và token.";
    return;
  }

  try {
    const res = await fetch(USERS_URL + `?t=${Date.now()}`);
    if (!res.ok) throw new Error("Không đọc được users.json");
    const users = await res.json();

    if (!users[user] || users[user] !== pass) {
      loginErrEl.textContent = "Sai user hoặc password.";
      return;
    }

    // Test nhanh token bằng 1 request nhẹ (lấy repo info)
    const testRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!testRes.ok) {
      loginErrEl.textContent = "Token GitHub không hợp lệ hoặc không có quyền repo.";
      return;
    }

    setSession({ user, token });
    showUploadView(user);
    log(`Đăng nhập thành công: ${user}`);
  } catch (err) {
    loginErrEl.textContent = err.message;
  }
});

// ========== LOGOUT ==========
btnLogout.addEventListener("click", () => {
  clearSession();
  location.reload();
});

// ========== UPLOAD ==========
let currentFiles = [];

fileInput.addEventListener("change", () => {
  currentFiles = Array.from(fileInput.files || []);
  renderFileList();
});

function renderFileList() {
  fileListEl.innerHTML = "";
  currentFiles.forEach(f => {
    const row = document.createElement("div");
    row.className = "file-row";
    row.innerHTML = `
      <div>${f.name}</div>
      <div class="status status-run">Chờ xử lý...</div>
      <div class="time">-</div>
    `;
    fileListEl.appendChild(row);
  });
}

btnStart.addEventListener("click", async () => {
  const sess = getSession();
  if (!sess || !sess.user || !sess.token) {
    alert("Phiên đăng nhập hết hạn. Vui lòng login lại.");
    clearSession();
    location.reload();
    return;
  }
  const ghToken = sess.token;
  const user    = sess.user;

  if (currentFiles.length === 0) {
    alert("Chưa chọn hình.");
    return;
  }

  btnStart.disabled = true;
  log(`Bắt đầu xử lý ${currentFiles.length} file...`);

  const rows = Array.from(fileListEl.children);

  for (let i = 0; i < currentFiles.length; i++) {
    const file = currentFiles[i];
    const row = rows[i];
    const statusEl = row.querySelector(".status");
    const timeEl   = row.querySelector(".time");

    const t0 = performance.now();

    try {
      statusEl.textContent = "Đang đọc QR...";
      statusEl.className = "status status-run";

      const qrText = await decodeQRFromFile(file);

      if (!qrText) {
        statusEl.textContent = "❌ Không đọc được QR → Failed (không upload)";
        statusEl.className = "status status-fail";

        const elapsed = (performance.now() - t0) / 1000;
        timeEl.textContent = elapsed.toFixed(1) + "s";

        // Ghi log FAILED_QR nhưng không upload file
        await appendLogEntry(ghToken, {
          time: new Date().toISOString(),
          user,
          original: file.name,
          savedAs: null,
          qr: null,
          status: "FAILED_QR"
        });

        log(`FAILED_QR: ${file.name}`);
        continue;
      }

      // clean tên QR
      const cleanQR = qrText.replace(/[^0-9A-Za-z_-]/g, "");
      if (!cleanQR) {
        statusEl.textContent = "❌ QR đọc được nhưng không hợp lệ.";
        statusEl.className = "status status-fail";
        continue;
      }

      // Nén ảnh
      statusEl.textContent = "Đang nén hình...";
      const base64Image = await compressToBase64(file);

      // Upload lên inbox/Done/{QR}.jpg
      statusEl.textContent = "Đang upload...";
      const destPath = `inbox/Done/${cleanQR}.jpg`;
      await githubPutFile(ghToken, destPath, base64Image, `Upload DN ${cleanQR}`);

      const elapsed = (performance.now() - t0) / 1000;
      timeEl.textContent = elapsed.toFixed(1) + "s";
      statusEl.textContent = `✔ DONE – ${cleanQR}.jpg`;
      statusEl.className = "status status-ok";

      // Ghi log
      await appendLogEntry(ghToken, {
        time: new Date().toISOString(),
        user,
        original: file.name,
        savedAs: destPath,
        qr: cleanQR,
        status: "DONE"
      });

      log(`DONE: ${file.name} → ${destPath}`);
    } catch (err) {
      console.error(err);
      statusEl.textContent = "✗ Lỗi upload";
      statusEl.className = "status status-fail";
      timeEl.textContent = "-";
      log(`ERROR: ${file.name} – ${err.message}`, true);
    }
  }

  btnStart.disabled = false;
  log("Hoàn tất xử lý tất cả file.");
});

// ========== IMAGE COMPRESS & PUT ==========
async function compressToBase64(file, maxWidth = 1600, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      let w = img.width;
      let h = img.height;
      if (w > maxWidth) {
        h = h * (maxWidth / w);
        w = maxWidth;
      }

      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);

      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve(dataUrl.split(",")[1]); // chỉ lấy phần base64
    };
    img.onerror = () => reject(new Error("Không đọc được ảnh để nén"));
    img.src = URL.createObjectURL(file);
  });
}

// PUT file vào repo
async function githubPutFile(ghToken, path, base64Content, message, sha) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${encodeURIComponent(path)}`;

  const body = {
    message: message || `Upload ${path}`,
    content: base64Content,
    branch: "main"
  };
  if (sha) body.sha = sha;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${ghToken}`,
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
