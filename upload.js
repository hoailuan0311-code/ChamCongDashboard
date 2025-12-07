// ===============================
//  Upload Delivery Note v5.0
//  1) PUT file vào inbox/tmp/... trong repo
//  2) Dispatch event nhỏ tới GitHub Actions để xử lý (QR + nén + Done/Failed)
//  Token nhập lúc chạy, KHÔNG commit vào repo
// ===============================

const repoUser = "hoailuan0311-code";
const repoName = "ChamCongDashboard";

// Token runtime (repo classic: scope repo + workflow, hoặc fine-grained: Contents RW + Actions RW)
let DISPATCH_TOKEN = "";

// Hỏi token 1 lần cho tới khi reload trang
function getDispatchToken() {
  if (DISPATCH_TOKEN) return DISPATCH_TOKEN;
  const t = prompt("Nhập GitHub Token (PAT có quyền repo + workflow):");
  if (!t) {
    alert("Không có token → không thể upload.");
    throw new Error("Missing token");
  }
  DISPATCH_TOKEN = t.trim();
  return DISPATCH_TOKEN;
}

// ====== UI helpers ======
function logBox(msg, isError = false) {
  const box = document.getElementById("logs");
  const color = isError ? "red" : "#111827";
  box.innerHTML += `<div style="color:${color}; margin-bottom:4px;">${msg}</div>`;
  box.scrollTop = box.scrollHeight;
}

function fileToBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.readAsDataURL(file);
  });
}

function makeItemPreview(file, url) {
  const container = document.getElementById("processing");
  const div = document.createElement("div");
  div.className = "item";
  div.innerHTML = `
    <img class="thumb" src="${url}">
    <div class="info">
      <div class="name"><b>${file.name}</b></div>
      <div class="progress"><div class="bar"></div></div>
      <div class="status">Đang chờ...</div>
    </div>
  `;
  container.appendChild(div);
  return div;
}

async function putTempFileToRepo(tmpPath, base64, originalName) {
  const token = getDispatchToken();
  const url = `https://api.github.com/repos/${repoUser}/${repoName}/contents/${encodeURIComponent(tmpPath)}`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: `Upload temp image ${originalName}`,
      content: base64,
      branch: "main"
    })
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`PUT /contents lỗi ${res.status}: ${txt}`);
  }
}

async function dispatchProcessEvent(user, originalName, tmpPath) {
  const token = getDispatchToken();
  const url = `https://api.github.com/repos/${repoUser}/${repoName}/dispatches`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      event_type: "process_dn",
      client_payload: {
        user: user.username,
        original: originalName,
        tmp_path: tmpPath
      }
    })
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`dispatch lỗi ${res.status}: ${txt}`);
  }
}

// ================= MAIN =================

async function startUpload() {
  const input = document.getElementById("fileInput");
  const files = [...input.files];

  if (files.length === 0) {
    alert("Chưa chọn hình.");
    return;
  }

  const user = JSON.parse(sessionStorage.getItem("uploadUser") || "{}");
  if (!user.username) {
    alert("Chưa đăng nhập.");
    return;
  }

  for (const file of files) {
    const previewURL = URL.createObjectURL(file);
    const item = makeItemPreview(file, previewURL);
    const bar = item.querySelector(".bar");
    const status = item.querySelector(".status");

    try {
      bar.style.width = "15%";
      status.textContent = "Đang mã hóa hình...";
      const base64 = await fileToBase64(file);

      // Tạo tên temp: inbox/tmp/ts_random.jpg
      const ts = Date.now();
      const rand = Math.random().toString(36).slice(2, 8);
      const tmpName = `${ts}_${rand}.jpg`;
      const tmpPath = `inbox/tmp/${tmpName}`;

      bar.style.width = "45%";
      status.textContent = "Đẩy file tạm vào repo...";

      await putTempFileToRepo(tmpPath, base64, file.name);

      bar.style.width = "70%";
      status.textContent = "Gửi yêu cầu xử lý (Action)...";

      await dispatchProcessEvent(user, file.name, tmpPath);

      bar.style.width = "100%";
      status.textContent = "✔ Đã gửi – Action đang xử lý...";
      logBox(`✔ Gửi file ${file.name} thành công → tmp: ${tmpPath}`);
    } catch (err) {
      console.error(err);
      bar.style.width = "100%";
      bar.style.background = "red";
      status.textContent = "✖ Lỗi gửi!";
      logBox(`✖ Gửi thất bại: ${file.name} – ${err.message}`, true);
    }
  }
}
