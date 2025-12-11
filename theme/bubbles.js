// 🫧 Bong bóng bay lên
function bubble() {
    const b = document.createElement("div");
    b.style.position = "fixed";
    b.style.left = Math.random()*100 + "vw";
    b.style.bottom = "-20px";
    b.style.width = b.style.height = 10+Math.random()*20+"px";
    b.style.borderRadius = "50%";
    b.style.background = "rgba(255,255,255,0.4)";
    b.style.pointerEvents = "none";
    b.style.zIndex = 99999;
    b.style.animation = "bubbleUp 6s linear";
    document.body.appendChild(b);
    setTimeout(()=>b.remove(),6000);
}
setInterval(bubble,250);

const bubbleCSS = document.createElement("style");
bubbleCSS.innerHTML = `
@keyframes bubbleUp {
    from { transform: translateY(0); opacity:1; }
    to { transform: translateY(-120vh); opacity:0; }
}`;
document.head.appendChild(bubbleCSS);
