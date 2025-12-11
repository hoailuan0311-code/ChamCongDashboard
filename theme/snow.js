// ❄️ Tuyết rơi
function makeSnow() {
    const s = document.createElement("div");
    s.textContent = "❄";
    s.style.position = "fixed";
    s.style.left = Math.random()*100 + "vw";
    s.style.top = "-20px";
    s.style.fontSize = 14 + Math.random()*16 + "px";
    s.style.opacity = 0.8;
    s.style.pointerEvents = "none";
    s.style.zIndex = 99999;
    s.style.animation = "snowFall 7s linear";
    document.body.appendChild(s);
    setTimeout(()=>s.remove(),7000);
}
setInterval(makeSnow,160);

const snowCSS = document.createElement("style");
snowCSS.innerHTML = `
@keyframes snowFall {
    from { transform: translateY(0); }
    to { transform: translateY(110vh); }
}`;
document.head.appendChild(snowCSS);
