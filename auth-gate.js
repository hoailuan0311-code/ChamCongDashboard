/* =====================================================================
   auth-gate.js  –  Khóa thao tác theo đăng nhập Google + Nhật ký truy cập
   Dùng chung Firebase app đã khởi tạo trong index.html (project ryobi-wh-dashboard).
   Tự inject: thanh đăng nhập, hiệu ứng shimmer + badge 🔒 cho 5 nút, modal Nhật ký.

   CÁCH GẮN:
     1. Đặt file này cạnh index.html.
     2. Thêm DÒNG NÀY ngay trước </body> (SAU khối <script type="module"> Firebase cũ):
            <script type="module" src="auth-gate.js"></script>
     3. Sửa khối nút trong index.html theo hướng dẫn (xem tin nhắn).

   ⚠️ Firestore Rules cần cho phép ghi 2 collection `users` và `sessions`
      (giống collection `comments` đang dùng). Nếu rule đang khóa, session sẽ
      không ghi được.
   ===================================================================== */
import { getApps, getApp, initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  getFirestore, collection, doc, addDoc, setDoc, updateDoc,
  serverTimestamp, increment, query, orderBy, limit, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

/* ---------- CẤU HÌNH ---------- */
// 👉 Điền email Google của bạn (và ai được xem Nhật ký) vào đây:
const ADMIN_EMAILS = ["hoailuan0311@gmail.com"];
const HEARTBEAT_MS  = 60000;   // nhịp tim cập nhật lastSeen (60s)

const firebaseConfig = {
  apiKey: "AIzaSyCWBCctVLzgx6HKUI7mQYDGAZvezEiLpto",
  authDomain: "ryobi-wh-dashboard.firebaseapp.com",
  projectId: "ryobi-wh-dashboard",
  storageBucket: "ryobi-wh-dashboard.firebasestorage.app",
  messagingSenderId: "376016621588",
  appId: "1:376016621588:web:63b3510904ee246d2ad701"
};

const app  = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

/* ---------- State ---------- */
let currentSessionRef = null;   // doc phiên hiện tại
let heartbeat = null;
let pendingAction = null;       // hành động chờ chạy sau khi đăng nhập

/* =====================================================================
   API toàn cục cho các nút trong index.html dùng (window.AUTH)
   ===================================================================== */
window.AUTH = {
  user: null,
  login() { return signInWithPopup(auth, googleProvider).catch(err => { toast("Đăng nhập thất bại: " + err.message, "#3a1f28"); console.error(err); }); },
  logout() { return signOut(auth); },
  /* Gọi khi nút bị khóa: mở popup đăng nhập, đăng nhập xong tự chạy fn */
  requireLogin(name, fn) {
    pendingAction = fn || null;
    toast('🔒 "' + name + '" cần đăng nhập trước', "#2a1f0e");
    shakeBar();
    this.login();
  }
};

/* =====================================================================
   CSS (shimmer + badge 🔒 + thanh login + modal nhật ký)
   ===================================================================== */
(function injectCSS() {
  const s = document.createElement("style");
  s.textContent = `
  @keyframes agShine{0%{left:-60%}55%,100%{left:130%}}
  @keyframes agSpin{to{transform:rotate(360deg)}}
  /* shimmer + lock cho 5 nút */
  #feedbackBtn,#passBtn,#viewPassBtn,#missFormBtn,#leaveFormBtn{position:relative;overflow:hidden}
  #feedbackBtn::before,#passBtn::before,#viewPassBtn::before,#missFormBtn::before,#leaveFormBtn::before{
    content:"";position:absolute;top:0;left:-60%;width:42%;height:100%;
    background:linear-gradient(100deg,transparent,rgba(255,255,255,.22),transparent);
    animation:agShine 3.4s ease-in-out infinite;pointer-events:none;z-index:2}
  #passBtn::before{animation-delay:.5s}#viewPassBtn::before{animation-delay:1s}
  #missFormBtn::before{animation-delay:1.5s}#leaveFormBtn::before{animation-delay:2s}
  body.ag-anon #feedbackBtn::after,body.ag-anon #passBtn::after,body.ag-anon #viewPassBtn::after,
  body.ag-anon #missFormBtn::after,body.ag-anon #leaveFormBtn::after{
    content:"🔒";position:absolute;top:3px;right:7px;font-size:11px;opacity:.92;z-index:3;
    filter:drop-shadow(0 0 3px rgba(0,0,0,.6))}
  /* thanh đăng nhập */
  #agBar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:14px;padding:11px 16px;
    background:#0e121b;border:1px solid #2a3a4a;border-radius:13px;font-family:inherit}
  #agBar .agL{font-size:13px;color:#b9c8d6;flex:1;min-width:160px}
  #agBar button{display:flex;align-items:center;gap:7px;cursor:pointer;font:600 13px inherit;color:#eaf6ff;
    background:#16202b;border:1px solid #3a4a5a;border-radius:10px;padding:8px 13px;transition:transform .15s}
  #agBar button:hover{transform:translateY(-2px)}
  #agBar img{width:30px;height:30px;border-radius:50%;object-fit:cover}
  /* modal nhật ký */
  #agLogModal{position:fixed;inset:0;background:rgba(4,7,12,.72);backdrop-filter:blur(3px);
    display:none;align-items:center;justify-content:center;z-index:99999}
  #agLogModal.open{display:flex}
  #agLogModal .card{width:min(760px,92vw);max-height:84vh;overflow:auto;background:#0e121b;
    border:1px solid #2a3a4a;border-radius:16px;padding:18px 20px;box-shadow:0 20px 60px rgba(0,0,0,.6)}
  #agLogModal table{width:100%;border-collapse:collapse;font-size:12.5px;color:#cfe}
  #agLogModal th{position:sticky;top:0;background:#0e121b;text-align:left;color:#7c8b96;font-weight:600;padding:8px 9px}
  #agLogModal td{padding:8px 9px;border-top:1px solid #1c2733}
  #agToastWrap{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:100000;display:flex;flex-direction:column;gap:8px;align-items:center}
  .agToast{background:#16202b;border:1px solid #2dd4a0;color:#eaf6ff;font:13px inherit;padding:9px 18px;
    border-radius:22px;box-shadow:0 8px 24px rgba(0,0,0,.45);opacity:0;transform:translateY(8px);transition:all .3s}
  .agToast.show{opacity:1;transform:translateY(0)}`;
  document.head.appendChild(s);
})();

/* ---------- Toast ---------- */
function ensureToastWrap() {
  let w = document.getElementById("agToastWrap");
  if (!w) { w = document.createElement("div"); w.id = "agToastWrap"; document.body.appendChild(w); }
  return w;
}
function toast(msg, bg) {
  const w = ensureToastWrap();
  const t = document.createElement("div");
  t.className = "agToast"; t.innerHTML = msg;
  if (bg) t.style.background = bg;
  w.appendChild(t);
  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 350); }, 2600);
}
function shakeBar() {
  const bar = document.getElementById("agBar");
  if (bar && bar.animate) bar.animate(
    [{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(0)" }],
    { duration: 300 });
}

/* ---------- Thanh đăng nhập ---------- */
function buildBar() {
  if (document.getElementById("agBar")) return;
  const bar = document.createElement("div");
  bar.id = "agBar";
  bar.innerHTML = `<span id="agBarIcon">🔒</span>
    <span class="agL" id="agBarText">Chế độ <b>Xem</b> — đăng nhập để thao tác</span>
    <button id="agLoginBtn">
      <svg width="15" height="15" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C40.9 36.3 44 30.7 44 24c0-1.3-.1-2.3-.4-3.5z"/></svg>
      Đăng nhập Google</button>`;
  // chèn ngay sau .search-bar (nơi có 5 nút), nếu không có thì lên đầu body
  const anchor = document.querySelector(".search-bar");
  if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(bar, anchor.nextSibling);
  else document.body.insertBefore(bar, document.body.firstChild);
  document.getElementById("agLoginBtn").onclick = () => window.AUTH.login();
}

function renderBar(user) {
  const icon = document.getElementById("agBarIcon");
  const text = document.getElementById("agBarText");
  const btn  = document.getElementById("agLoginBtn");
  if (!icon) return;
  if (user) {
    icon.textContent = "✅";
    text.innerHTML = `<img src="${user.photoURL || ''}" referrerpolicy="no-referrer" style="vertical-align:middle;margin-right:8px"><b>${esc(user.displayName || user.email)}</b> — đã đăng nhập`;
    btn.innerHTML = "↩️ Đăng xuất"; btn.onclick = () => window.AUTH.logout();
    // nút Nhật ký (chỉ admin)
    if (ADMIN_EMAILS.includes((user.email || "").toLowerCase()) && !document.getElementById("agLogBtn")) {
      const lb = document.createElement("button");
      lb.id = "agLogBtn"; lb.innerHTML = "🗂️ Nhật ký";
      lb.onclick = openLogModal;
      document.getElementById("agBar").appendChild(lb);
    }
  } else {
    icon.textContent = "🔒";
    text.innerHTML = `Chế độ <b>Xem</b> — đăng nhập để thao tác`;
    btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C40.9 36.3 44 30.7 44 24c0-1.3-.1-2.3-.4-3.5z"/></svg> Đăng nhập Google`;
    btn.onclick = () => window.AUTH.login();
    const lb = document.getElementById("agLogBtn"); if (lb) lb.remove();
  }
}
function esc(s){ return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

/* =====================================================================
   Ghi nhật ký phiên (sessions) + hồ sơ (users) + heartbeat
   ===================================================================== */
async function startSession(user) {
  try {
    await setDoc(doc(db, "users", user.uid), {
      email: user.email || "", name: user.displayName || "", photo: user.photoURL || "",
      provider: "google", lastSeen: serverTimestamp(), lastLoginAt: serverTimestamp(),
      loginCount: increment(1)
    }, { merge: true });
  } catch (e) { console.warn("[auth-gate] users upsert lỗi:", e.message); }

  try {
    currentSessionRef = await addDoc(collection(db, "sessions"), {
      uid: user.uid, email: user.email || "", name: user.displayName || "",
      provider: "google", userAgent: navigator.userAgent,
      loginAt: serverTimestamp(), logoutAt: null, lastSeen: serverTimestamp()
    });
  } catch (e) { console.warn("[auth-gate] tạo session lỗi:", e.message); currentSessionRef = null; }

  clearInterval(heartbeat);
  heartbeat = setInterval(() => {
    if (currentSessionRef) updateDoc(currentSessionRef, { lastSeen: serverTimestamp() }).catch(() => {});
  }, HEARTBEAT_MS);
}
async function endSession() {
  clearInterval(heartbeat); heartbeat = null;
  if (currentSessionRef) {
    try { await updateDoc(currentSessionRef, { logoutAt: serverTimestamp() }); } catch (e) {}
    currentSessionRef = null;
  }
}
// best-effort khi đóng tab (không đảm bảo gửi kịp — đã có lastSeen bù)
window.addEventListener("pagehide", () => {
  if (currentSessionRef) updateDoc(currentSessionRef, { logoutAt: serverTimestamp() }).catch(() => {});
});

/* =====================================================================
   Modal Nhật ký truy cập (chỉ admin)
   ===================================================================== */
let logUnsub = null;
function buildLogModal() {
  if (document.getElementById("agLogModal")) return;
  const m = document.createElement("div");
  m.id = "agLogModal";
  m.innerHTML = `<div class="card">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
      <span style="font-size:15px;font-weight:800;color:#7af0c4">🗂️ Nhật ký truy cập</span>
      <span style="font-size:11px;color:#566">collection sessions • 100 phiên gần nhất</span>
      <button id="agLogClose" style="margin-left:auto;cursor:pointer;background:#16202b;border:1px solid #3a4a5a;color:#cfe;border-radius:8px;padding:5px 11px">Đóng ✕</button>
    </div>
    <table><thead><tr><th>Người dùng</th><th>Đăng nhập</th><th>Đăng xuất</th><th>Hoạt động cuối</th><th>Thiết bị</th></tr></thead>
    <tbody id="agLogBody"><tr><td colspan="5" style="text-align:center;color:#667;padding:18px">Đang tải…</td></tr></tbody></table>
  </div>`;
  document.body.appendChild(m);
  document.getElementById("agLogClose").onclick = closeLogModal;
  m.onclick = (e) => { if (e.target === m) closeLogModal(); };
}
function fmt(ts) {
  if (!ts) return null;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function shortUA(ua) {
  ua = ua || "";
  let os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac/.test(ua) ? "macOS" : "Khác";
  let br = /Edg/.test(ua) ? "Edge" : /Chrome/.test(ua) ? "Chrome" : /Firefox/.test(ua) ? "Firefox" : /Safari/.test(ua) ? "Safari" : "";
  return (br ? br + " · " : "") + os;
}
function openLogModal() {
  buildLogModal();
  document.getElementById("agLogModal").classList.add("open");
  const q = query(collection(db, "sessions"), orderBy("loginAt", "desc"), limit(100));
  logUnsub = onSnapshot(q, (snap) => {
    const rows = snap.docs.map(d => d.data());
    const body = document.getElementById("agLogBody");
    if (!rows.length) { body.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#667;padding:18px">Chưa có dữ liệu</td></tr>`; return; }
    body.innerHTML = rows.map(r => {
      const out = fmt(r.logoutAt);
      return `<tr>
        <td><b style="color:#cfe">${esc(r.name || "—")}</b><br><span style="color:#7c8b96;font-size:11px">${esc(r.email || "")}</span></td>
        <td>${fmt(r.loginAt) || "—"}</td>
        <td style="color:${out ? '#7af0c4' : '#889'}">${out || "— đang mở"}</td>
        <td style="color:#9ab">${fmt(r.lastSeen) || "—"}</td>
        <td style="color:#9ab;font-size:11px">${esc(shortUA(r.userAgent))}</td></tr>`;
    }).join("");
  }, (err) => { console.warn(err); });
}
function closeLogModal() {
  const m = document.getElementById("agLogModal"); if (m) m.classList.remove("open");
  if (logUnsub) { logUnsub(); logUnsub = null; }
}

/* =====================================================================
   Theo dõi trạng thái đăng nhập
   ===================================================================== */
function init() {
  buildBar();
  document.body.classList.add("ag-anon");

  onAuthStateChanged(auth, async (user) => {
    window.AUTH.user = user || null;
    renderBar(user);

    if (user) {
      document.body.classList.remove("ag-anon");
      await startSession(user);
      // chạy hành động đang chờ (nếu user bấm nút khi chưa đăng nhập)
      if (pendingAction) { const fn = pendingAction; pendingAction = null; try { fn(); } catch (e) {} }
      toast("✅ Đăng nhập thành công", "#0e3a2a");
    } else {
      document.body.classList.add("ag-anon");
      pendingAction = null;
      await endSession();
    }
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();