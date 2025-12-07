const repoUser = "hoailuan0311-code";
const repoName = "ChamCongDashboard";

// Token frontend chỉ cần quyền `actions: write`, KHÔNG ghi file được
const DISPATCH_TOKEN = "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";

function logBox(msg) {
  logs.innerHTML += `<div>${msg}</div>`;
  logs.scrollTop = logs.scrollHeight;
}

async function fileToBase64(file) {
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
    <div>
      <div><b>${file.name}</b></div>
      <div class="progress"><div class="bar"></div></div>
      <div class="status">Đang chờ...</div>
    </div>`;
  processing.appendChild(div);
  return div;
}

async function startUpload() {
  const files = [...fileInput.files];
  const user = JSON.parse(sessionStorage.getItem("uploadUser"));

  for (const file of files) {
    const thumbURL = URL.createObjectURL(file);
    const item = makeItemPreview(file, thumbURL);

    const bar = item.querySelector(".bar");
    const status = item.querySelector(".status");

    bar.style.width = "20%";
    status.textContent = "Đang mã hóa hình...";

    const base64 = await fileToBase64(file);

    bar.style.width = "50%";
    status.textContent = "Gửi lên GitHub Action...";

    await fetch(`https://api.github.com/repos/${repoUser}/${repoName}/dispatches`, {
      method: "POST",
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${DISPATCH_TOKEN}`
      },
      body: JSON.stringify({
        event_type: "upload_dn",
        client_payload: {
          user: user.username,
          filename: file.name,
          filedata: base64
        }
      })
    });

    bar.style.width = "100%";
    status.textContent = "✔ Đã gửi – Action đang xử lý...";
    logBox("Đã gửi file " + file.name + " → Action xử lý");
  }
}

