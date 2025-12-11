// ❤️ Hiệu ứng trái tim bay nhẹ
function spawnHeart() {
    const h = document.createElement("div");
    h.textContent = "❤";
    h.style.position = "fixed";
    h.style.left = Math.random()*100 + "vw";
    h.style.bottom = "-20px";
    h.style.fontSize = 20 + Math.random()*20 + "px";
    h.style.opacity = 0.8;
    h.style.zIndex = 99999;
    h.style.pointerEvents = "none";
    h.style.animation = "heart-float 4s linear forwards";
    document.body.appendChild(h);
    setTimeout(()=>h.remove(),4000);
}
setInterval(spawnHeart,300);

const heartStyle = document.createElement("style");
heartStyle.innerHTML = `
@keyframes heart-float {
    from { transform: translateY(0) scale(1); opacity:1; }
    to { transform: translateY(-120vh) scale(1.8); opacity:0; }
}`;
document.head.appendChild(heartStyle);
