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
//  KIỂM TRA LOGIN
//---------------------------------------------------
(function initLogin() {
    const user = localStorage.getItem("session_user");
    const token = localStorage.getItem("session_token");

    if (!user || !token) {
        window.location.href = "upload_login.html";
        return;
    }

    document.getElementById("username").innerText = `Xin chào ${user}!`;
    ghToken = token;
})();

function logout() {
    localStorage.removeItem("session_user");
    localStorage.removeItem("session_token");
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
        await processFile(file);
    }
}


//---------------------------------------------------
//  XỬ LÝ 1 FILE
//---------------------------------------------------
async function processFile(file) {
    const row = addRow(file.name, "Đang xử lý…");

    try {
        // 1) Load hình
        const img = await loadImage(file);

        // 2) Decode QR — bắt buộc ra QR
        const qr = await decodeQR(img);

        if (!qr) {
            row.status.innerText = "❌ Không đọc được QR → Failed";
            await uploadFailed(file);
            return;
        }

        row.status.innerText = `QR: ${qr}`;

        // 3) Nén hình
        const compressed = await compressImage(img);

        // 4) Upload GitHub
        const newName = `${qr}.jpg`;
        await uploadDone(compressed, newName);

        row.status.innerText = "✔ Thành công";
        row.time.innerText = new Date().toLocaleTimeString();

        // 5) Ghi log
        await writeLog({
            user: localStorage.getItem("session_user"),
            file: newName,
            time: Date.now(),
            qr
        });

    } catch (err) {
        console.error(err);
        row.status.innerText = "❌ Lỗi xử lý";
        await uploadFailed(file);
    }
}


//---------------------------------------------------
//  ADD ROW UI
//---------------------------------------------------
function addRow(name, status) {
    const tbody = document.getElementById("fileTable");
    const tr = document.createElement("tr");

    tr.innerHTML = `
        <td>${name}</td>
        <td class="st">${status}</td>
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
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = URL.createObjectURL(file);
    });
}


//---------------------------------------------------
//  NÉN ẢNH
//---------------------------------------------------
function compressImage(img) {
    return new Promise((resolve) => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const MAX = 1600;
        let w = img.width;
        let h = img.height;

        if (w > MAX) {
            h = h * (MAX / w);
            w = MAX;
        }

        canvas.width = w;
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

    if (!res.ok) throw new Error(await res.text());
}


//---------------------------------------------------
//  UPLOAD FAILED
//---------------------------------------------------
async function uploadFailed(file) {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${PATH_FAILED}/${file.name}`;
    const base64 = await blobToBase64(file);

    await fetch(url, {
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
}


//---------------------------------------------------
//  WRITE LOG
//---------------------------------------------------
async function writeLog(entry) {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${LOG_FILE}`;

    let old = "[]";
    let sha = null;

    // đọc log
    let res = await fetch(url, {
        headers: { "Authorization": `Bearer ${ghToken}` }
    });

    if (res.status === 200) {
        const js = await res.json();
        sha = js.sha;
        old = atob(js.content);
    }

    let arr = [];
    try { arr = JSON.parse(old); } catch {}

    arr.push(entry);

    await fetch(url, {
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
}


//---------------------------------------------------
// UTIL
//---------------------------------------------------
function blobToBase64(blob) {
    return new Promise((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result.split(",")[1]);
        r.readAsDataURL(blob);
    });
}
