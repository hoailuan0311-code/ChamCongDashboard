// ======== Preview File ==========
const fileInput = document.getElementById("fileInput");
const fileList = document.getElementById("fileList");
let files = [];

fileInput.onchange = () => {
    files = [...fileInput.files];
    renderList();
};

function renderList() {
    fileList.innerHTML = "";

    for (let f of files) {
        const url = URL.createObjectURL(f);
        const div = document.createElement("div");
        div.className = "file-row";
        div.innerHTML = `
            <img src="${url}" class="file-img">
            <div class="status">${f.name}</div>
            <div class="time">Chờ upload...</div>
        `;
        fileList.appendChild(div);
    }
}

// ======= Bắt đầu upload ========
document.getElementById("startUpload").onclick = async () => {
    for (let f of files) {
        await processFile(f);
    }
};

async function processFile(file) {
    const row = [...fileList.children].find(r => r.innerHTML.includes(file.name));
    const status = row.querySelector(".status");
    const time = row.querySelector(".time");

    status.innerText = "Đang xử lý...";

    // 1. Giả lập decode QR
    const qr = "ASN_TEST_" + Math.floor(Math.random() * 99999);

    // 2. Upload GitHub
    const ok = await uploadToGitHub(file, qr + ".jpg");

    if (ok) {
        status.innerHTML = `✔ ${qr}.jpg`;
        time.innerText = new Date().toLocaleTimeString();
    } else {
        status.innerHTML = "❌ Lỗi upload";
    }
}

// ========= PUT to GitHub (token backend hoặc action) ==========
async function uploadToGitHub(file, newName) {
    // tạm thời cho return true để chạy UI ok
    return true;
}
