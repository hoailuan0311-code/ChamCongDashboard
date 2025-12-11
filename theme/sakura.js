// 🌸 Sakura rơi (nhiều & mượt)
function sakura() {
    const s = document.createElement("div");
    s.innerHTML = "🍂";
    s.style.position = "fixed";
    s.style.left = Math.random()*100 + "vw";
    s.style.top = "-20px";
    s.style.fontSize = 14+Math.random()*18+"px";
    s.style.pointerEvents = "none";
    s.style.zIndex = 99999;
    s.style.animation = "sakuraFall 8s linear";
    document.body.appendChild(s);
    setTimeout(()=>s.remove(),8000);
}
setInterval(sakura,150);

const sakuraCSS = document.createElement("style");
sakuraCSS.innerHTML = `
@keyframes sakuraFall {
    0% { transform: translateY(0) rotate(0); }
    100% { transform: translateY(110vh) rotate(720deg); }
}`;
document.head.appendChild(sakuraCSS);
