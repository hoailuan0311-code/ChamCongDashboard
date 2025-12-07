const repoUser = "hoailuan0311-code";
const repoName = "ChamCongDashboard";
const token = "GITHUB_TOKEN";  // để trong file riêng, không commit công khai

function log(text, type = "info") {
    const div = document.getElementById("status");
    const color = type === "error" ? "red" : "green";
    div.innerHTML += `<div style="color:${color};">${text}</div>`;
    div.scrollTop = div.scrollHeight;
}

function updateProgress(current, total) {
    const bar = document.getElementById("progressBar");
    bar.style.width = (current / total * 100) + "%";
}

async function uploadToGitHub(path, content) {
    const url = `https://api.github.com/repos/${repoUser}/${repoName}/contents/${path}`;

    const res = await fetch(url, {
        method: "PUT",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: `Upload ${path}`,
            content: content,
            branch: "main"
        })
    });

    return res.json();
}

async function saveLog(entry) {
    const logPath = "logs/upload_log.json";

    const getUrl = `https://api.github.com/repos/${repoUser}/${repoName}/contents/${logPath}`;
    let existing = [];
    let sha = null;

    const check = await fetch(getUrl);
    if (check.ok) {
        const data = await check.json();
        sha = data.sha;
        existing = JSON.parse(atob(data.content));
    }

    existing.push(entry);

    await fetch(getUrl, {
        method: "PUT",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: "Update upload log",
            content: btoa(JSON.stringify(existing, null, 2)),
            branch: "main",
            sha: sha
        })
    });
}

async function startUpload() {
    const files = document.getElementById("fileInput").files;
    if (files.length === 0) return;

    let index = 0;

    for (let file of files) {
        index++;
        updateProgress(index, files.length);

        document.getElementById("preview").innerHTML =
            `<img src="${URL.createObjectURL(file)}" class="preview">`;

        log(`📌 Xử lý: ${file.name}`);

        const qrText = await decodeQRFromImage(file);

        let savePath = "";
        let arrayBuffer = await file.arrayBuffer();
        let base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

        if (!qrText) {
            savePath = `inbox/Failed/${file.name}`;
            await uploadToGitHub(savePath, base64);
            log(`❌ Không đọc QR → lưu vào Failed/${file.name}`, "error");

            await saveLog({
                file: file.name,
                status: "FAILED",
                time: new Date().toISOString()
            });

            continue;
        }

        const safe = qrText.replace(/[^a-zA-Z0-9_-]/g, "_");
        savePath = `inbox/Done/${safe}.jpg`;

        let res = await uploadToGitHub(savePath, base64);
        if (res.commit) {
            log(`✔ Thành công → ${savePath}`);

            await saveLog({
                file: file.name,
                rename: safe,
                status: "DONE",
                time: new Date().toISOString()
            });
        } else {
            log(`❌ Upload lỗi: ${file.name}`, "error");
        }
    }

    log("🎉 Hoàn tất toàn bộ!");
}
