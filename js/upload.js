const repoUser = "hoailuan0311-code";
const repoName = "ChamCongDashboard";
const token = "GITHUB_FINE_TOKEN";  // tôi sẽ tạo token dành riêng thư mục inbox

async function uploadToGitHub(path, content) {
    const url = `https://api.github.com/repos/${repoUser}/${repoName}/contents/${path}`;

    const res = await fetch(url, {
        method: "PUT",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: "Upload auto rename image",
            content: content,
            branch: "main"
        })
    });

    return res.json();
}

async function startUpload() {
    const files = document.getElementById('fileInput').files;
    if (files.length === 0) return;

    document.getElementById("status").innerHTML = "⏳ Đang xử lý...";

    for (let file of files) {
        const qrText = await decodeQRFromImage(file);

        let safe = "UNREAD_QR";
        if (qrText) {
            safe = qrText.replace(/[^a-zA-Z0-9_-]/g, "_");
        }

        const newName = `processed/${safe}.jpg`;

        const arrayBuffer = await file.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

        await uploadToGitHub(newName, base64);

        document.getElementById("status").innerHTML += `<br>✔ ${file.name} → ${newName}`;
    }

    document.getElementById("status").innerHTML += "<br><br>🎉 Hoàn tất!";
}

