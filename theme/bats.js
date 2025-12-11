// 🦇 Dơi bay qua màn hình
function bat() {
    const b = document.createElement("div");
    b.innerHTML = "🦇";
    b.style.position = "fixed";
    b.style.top = Math.random()*60 + "vh";
    b.style.left = "-40px";
    b.style.fontSize = 30 + "px";
    b.style.animation = "batFly 5s linear";
    b.style.pointerEvents = "none";
    b.style.zIndex = 99999;
    document.body.appendChild(b);
    setTimeout(()=>b.remove(),5000);
}
setInterval(bat,600);

const batCSS = document.createElement("style");
batCSS.innerHTML = `
@keyframes batFly {
    from { transform: translateX(0); }
    to { transform: translateX(120vw); }
}`;
document.head.appendChild(batCSS);
