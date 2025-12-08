// ========== BẢO VỆ ROUTE ==========
const user = JSON.parse(localStorage.getItem("upload_user"));
if (!user) {
    window.location.href = "upload_login.html";
}

document.getElementById("usernameLabel").innerText = user.username;
document.getElementById("avatar").innerText = user.username[0].toUpperCase();

// ========== DROPDOWN MENU ==========
const userMenu = document.getElementById("userMenu");
const dropdown = document.getElementById("dropdownMenu");

userMenu.onclick = () => {
    dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
};

document.addEventListener("click", (e) => {
    if (!userMenu.contains(e.target)) dropdown.style.display = "none";
});

// ========== LOGOUT ==========
document.getElementById("logoutBtn").onclick = () => {
    localStorage.removeItem("upload_user");
    window.location.href = "upload_login.html";
};

// ========== FILE PREVIEW ==========
const fileInput = document.getElementById("fileInput");
const fileList = document.getElementById("fileList");

let files = [];

fileInput.onchange = () => {
    files = Array.from(fileInput.files);
    renderList();
};

function renderList() {
    fileList.innerHTML = "";

    files.forEach(f => {
        const url = URL.createObjectURL(f);
        const div = document.createElement("div");
        div.className = "file-row";

        div.innerHTML = `
            <img src="${url}" class="file-img">
            <div class="status">${f.name}</div>
            <div class="time">Chờ upload</div>
        `;
        fileList.appendChild(div);
    });
}

// ========== UPLOAD V6 (compress + rename + push GitHub PUT) ==========
document.getElementById("startUpload").onclick = async () => {

    for (let f of files) {
        const row = [...fileList.children].find(r => r.innerHTML.includes(f.name));
        const status = row.querySelector(".status");
        const time = row.querySelector(".time");

        status.innerText = "Đang xử lý...";

        // 1️⃣ Decode QR
        const qrText = await extractQR(f);
        if (!qrText) {
            status.innerHTML = "❌ Không đọc được QR";
            continue;
        }

        // 2️⃣ Compress ảnh
        const compressed = await compressImage(f);

        // 3️⃣ Upload lên GitHub (PUT)
        const newName = qrText + ".jpg";
        const ok = await uploadToGitHub(compressed, newName);

        if (ok) {
            status.innerHTML = `✔ Thành công → ${newName}`;
            time.innerText = new Date().toLocaleTimeString();
        } else {
            status.innerHTML = "❌ Upload thất bại";
        }
    }
};

// ===== Dummy Sample Functions =====
// Bạn thay vào bản QR thật và API PUT thật

async function extractQR(file) {
    return "ASN_TEST_123456"; // placeholder
}

async function compressImage(file) {
    return file; // tạm thời giữ nguyên
}

async function uploadToGitHub(file, newName) {
    return true; // placeholder
}
