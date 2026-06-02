// ===== LOAD FIREBASE (nếu chưa có) =====
if (!window.firebase) {
    const s1 = document.createElement("script");
    s1.src = "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js";
    document.head.appendChild(s1);

    const s2 = document.createElement("script");
    s2.src = "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js";
    document.head.appendChild(s2);

    s2.onload = initAds;
} else {
    initAds();
}

function initAds(){

// ===== FIREBASE CONFIG =====
const firebaseConfig = {
  apiKey: "AIzaSyCN9ntHNLZRm9gaeG0CNhA0asWXP2E78j8",
  authDomain: "zalo-checking-click.firebaseapp.com",
  projectId: "zalo-checking-click",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ===== INJECT CSS =====
const style = document.createElement("style");
style.innerHTML = `
.zalo-float{
 position:fixed;
 bottom:20px;
 right:20px;
 z-index:9999;
 display:flex;
 align-items:center;
 gap:10px;
 background:linear-gradient(135deg,#0084ff,#00c6ff);
 padding:10px 14px;
 border-radius:50px;
 color:#fff;
 text-decoration:none;
 box-shadow:0 6px 20px rgba(0,132,255,0.4);
 cursor:pointer;
}
.zalo-float img{
 width:32px;
 height:32px;
 border-radius:50%;
}

.zalo-popup{
 position:fixed;
 bottom:90px;
 right:20px;
 width:260px;
 background:#fff;
 border-radius:16px;
 padding:14px;
 box-shadow:0 10px 30px rgba(0,0,0,0.2);
 display:none;
 z-index:9999;
}
.zalo-popup img{
 width:50px;
 height:50px;
 border-radius:50%;
}
.zalo-popup .name{
 font-weight:700;
 margin-top:6px;
}
.zalo-popup .desc{
 font-size:12px;
 color:#666;
 margin:6px 0;
}
.zalo-popup a{
 display:block;
 text-align:center;
 background:#0084ff;
 color:#fff;
 padding:8px;
 border-radius:10px;
 text-decoration:none;
 font-weight:600;
}
`;
document.head.appendChild(style);

// ===== INJECT HTML =====
const html = `
<div class="zalo-popup" id="zaloPopup">
    <img src="https://i.ibb.co/ZR4hzbQT/Image-99.jpg">
    <div class="name">Mỹ Huyền</div>
    <div class="desc">Chuyên viên hổ trợ giải pháp tài chính • Hỗ trợ chi tiêu thẻ Tín Dụng (Phí rút chỉ: 1.7%)</div>
    <a href="https://zalo.me/0971517862" target="_blank" id="zaloLink">
        Zalo ngay: 0971517862
    </a>
</div>

<div class="zalo-float" id="zaloBtn">
    <img src="https://i.ibb.co/ZR4hzbQT/Image-99.jpg">
    Mỹ Huyền
</div>
`;
document.body.insertAdjacentHTML("beforeend", html);

// ===== LOGIC =====
const popup = document.getElementById("zaloPopup");
const btn = document.getElementById("zaloBtn");
const link = document.getElementById("zaloLink");

// toggle popup
btn.onclick = () => {
    popup.style.display = popup.style.display === "block" ? "none" : "block";
};

// click ngoài -> đóng
document.addEventListener("click", (e)=>{
    if(!popup.contains(e.target) && !btn.contains(e.target)){
        popup.style.display = "none";
    }
});

// tracking
link.onclick = () => {
    const now = new Date();

    db.collection("zalo_clicks").add({
        time: now.getTime(),
        hour: now.getHours(),
        type: "popup",
        device: /Mobi|Android/i.test(navigator.userAgent) ? "Mobile":"PC"
    });
};

}