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
// SESSION CHECK
//------------------------------------------------------------
(function () {
    const page = location.pathname.split("/").pop();

    const u = sessionStorage.getItem("session_user");
    const t = sessionStorage.getItem("session_token");

    if (page === "upload.html") {
        if (!u || !t) {
            window.location.href = "upload_login.html";
            return;
        }
        ghToken = t;

        const box = document.getElementById("username");
        if (box) box.textContent = `Xin chào ${u}`;
    }
})();


//------------------------------------------------------------
// LOGOUT
//------------------------------------------------------------
function logout() {
    sessionStorage.removeItem("session_user");
    sessionStorage.removeItem("session_token");
    window.location.href = "upload_login.html";
}


//------------------------------------------------------------
// START UPLOAD
//------------------------------------------------------------
async function startUpload() {
    const files = document.getElementById("files").files;
    if (!files.length) {
        alert("Chưa chọn file");
        return;
    }

    for (const f of files) {
        await processFile(f);
    }
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
        row.status.innerHTML = "✔ Upload thành công";
        row.time.innerText = new Date().toLocaleTimeString();

        await writeLog({
            user: sessionStorage.getItem("session_user"),
            qr,
            file: newName,
            ts: Date.now()
        });

    } catch (err) {
        console.error(err);
        row.status.innerHTML = "❌ Lỗi xử lý";
        await uploadFailed(file);
    }
}


//------------------------------------------------------------
// ADD ROW TO TABLE
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
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const MAX = 1600;
            let w = img.width, h = img.height;

            if (w > MAX) {
                h = (MAX / w) * h;
                w = MAX;
            }

            const c = document.createElement("canvas");
            c.width = w;
            c.height = h;
            c.getContext("2d").drawImage(img, 0, 0, w, h);

            c.toBlob(b => resolve(b), "image/jpeg", 0.75);
        };
        img.src = URL.createObjectURL(file);
    });
}


//------------------------------------------------------------
// UPLOAD FILE → DONE FOLDER
//------------------------------------------------------------
async function uploadDone(blob, filename) {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${PATH_DONE}/${filename}`;
    const base64 = await toBase64(blob);

    const sha = await getSHA(url);

    const res = await fetch(url, {
        method: "PUT",
        headers: {
            "Authorization": `Bearer ${ghToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: "upload done",
            content: base64,
            sha
        })
    });

    if (!res.ok) throw new Error(await res.text());
}


//------------------------------------------------------------
// UPLOAD FILE → FAILED FOLDER
//------------------------------------------------------------
async function uploadFailed(file) {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${PATH_FAILED}/${file.name}`;
    const base64 = await toBase64(file);

    const sha = await getSHA(url);

    const res = await fetch(url, {
        method: "PUT",
        headers: {
            "Authorization": `Bearer ${ghToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: "upload failed",
            content: base64,
            sha
        })
    });

    if (!res.ok) console.warn("Upload failed → GitHub error:", await res.text());
}


//------------------------------------------------------------
// GET SHA IF FILE EXISTS
//------------------------------------------------------------
async function getSHA(url) {
    const res = await fetch(url, {
        headers: {
            "Authorization": `Bearer ${ghToken}`
        }
    });

    if (res.status === 200) {
        const js = await res.json();
        return js.sha;
    }

    return undefined;
}


//------------------------------------------------------------
// WRITE LOG FILE
//------------------------------------------------------------
async function writeLog(entry) {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${LOG_FILE}`;

    let old = "[]";
    let sha = await getSHA(url);

    if (sha) {
        const res = await fetch(url, { headers: { "Authorization": `Bearer ${ghToken}` } });
        const js = await res.json();
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
            message: "update log",
            content: btoa(JSON.stringify(arr, null, 2)),
            sha
        })
    });
}


//------------------------------------------------------------
// BLOB → BASE64
//------------------------------------------------------------
function toBase64(blob) {
    return new Promise(resolve => {
        const r = new FileReader();
        r.onload = () => resolve(r.result.split(",")[1]);
        r.readAsDataURL(blob);
    });
}
