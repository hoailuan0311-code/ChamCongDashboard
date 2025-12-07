// ===============================
//  Upload Delivery Note (v4.1)
//  Frontend không chứa token
//  Token nhập lúc chạy bằng prompt()
// ===============================

const repoUser = "hoailuan0311-code";
const repoName = "ChamCongDashboard";

// Token runtime (không commit vào repo)
let DISPATCH_TOKEN = "";

// Hỏi token lần đầu cần gửi
function getDispatchToken() {
  if (DISPATCH_TOKEN) return DISPATCH_TOKEN;
  const t = prompt("Nhập Dispatch Token (PAT):");
  if (!t) {
    alert("Không có token → không thể upload.");
    throw new Error("Missing token");
  }
  DISPATCH_TOKEN = t.trim();
  return DISPATCH_TOKEN;
}

// ===============================
//  UI Helper
// ===============================

function logBox(msg) {
  logs.innerHTML += `<div>${msg}</div>`;
  logs.scrollTop = logs.scrollHeight;
}

function fileToBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.readAsDataURL(file);
  });
}

function makeItemPreview(file, url) {
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

  processing.appendChild(div);
  return div;
}

// ===============================
//  MAIN UPLOAD FUNCTION
// ===============================

async function startUpload() {
  const files = [...fileInput.files];
  const user = JSON.parse(sessionStorage.getItem("uploadUser"));

  if (files.length === 0) {
    alert("Chưa chọn hình.");
    return;
  }

  for (const file of files) {
    const previewURL = URL.createObjectURL(file);
    const item = makeItemPreview(file, previewURL);

    const bar = item.querySelector(".bar");
    const status = item.querySelector(".status");

    // Step 1: Encode file
    bar.style.width = "20%";
    status.textContent = "Đang mã hóa hình...";
    const base64 = await fileToBase64(file);

    // Step 2: Gửi đến GitHub Dispatch
    bar.style.width = "50%";
    status.textContent = "Gửi lên GitHub...";

    const response = await fetch(
      `https://api.github.com/repos/${repoUser}/${repoName}/dispatches`,
      {
        method: "POST",
        headers: {
          "Accept": "application/vnd.github+json",
          "Authorization": `Bearer ${getDispatchToken()}`,
        },
        body: JSON.stringify({
          event_type: "upload_dn",
          client_payload: {
            user: user.username,
            filename: file.name,
            filedata: base64
          }
        })
      }
    );

    if (!response.ok) {
      status.textContent = "❌ Lỗi gửi!";
      bar.style.background = "red";
      logBox(`❌ Gửi thất bại: ${file.name} (HTTP ${response.status})`);
      continue;
    }

    // Step 3: Success
    bar.style.width = "100%";
    status.textContent = "✔ Đã gửi – Action đang xử lý...";
    logBox(`Đã gửi file ${file.name} → Action xử lý`);
  }
}
