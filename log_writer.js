const REPO_OWNER = "hoailuan0311-code";
const REPO_NAME  = "ChamCongDashboard";
const LOG_PATH   = "logs/log.json";

// Đọc log.json hiện tại (nếu chưa có, trả [] và sha = null)
async function readCurrentLog(ghToken) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${LOG_PATH}`;
  const res = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${ghToken}`,
      "Accept": "application/vnd.github+json"
    }
  });

  if (res.status === 404) {
    return { entries: [], sha: null };
  }

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`GET log.json failed: ${res.status} – ${t}`);
  }

  const data = await res.json();
  const raw = atob(data.content.replace(/\n/g, ""));
  let arr = [];
  try { arr = JSON.parse(raw); } catch { arr = []; }
  return { entries: arr, sha: data.sha };
}

// Append entry rồi PUT lại
async function appendLogEntry(ghToken, entry) {
  const { entries, sha } = await readCurrentLog(ghToken);

  entries.push(entry);

  const newContent = btoa(unescape(encodeURIComponent(JSON.stringify(entries, null, 2))));

  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${LOG_PATH}`;
  const body = {
    message: "Update upload log",
    content: newContent,
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
    throw new Error(`PUT log.json failed: ${res.status} – ${t}`);
  }
}
