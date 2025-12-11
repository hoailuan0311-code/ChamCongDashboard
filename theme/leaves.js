// 🍁 Lá vàng mùa thu
function leafFall() {
    const el = document.createElement("div");
    el.innerHTML = "🍁";
    el.style.position = "fixed";
    el.style.left = Math.random()*100 + "vw";
    el.style.top = "-20px";
    el.style.fontSize = 16+Math.random()*18+"px";
    el.style.pointerEvents = "none";
    el.style.animation = "leafFallAnim 9s linear";
    el.style.zIndex = 99999;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),9000);
}
setInterval(leafFall,200);

const leafCSS = document.createElement("style");
leafCSS.innerHTML = `
@keyframes leafFallAnim {
    0% { transform: translateY(0) rotate(0deg); }
    100% { transform: translateY(110vh) rotate(540deg); }
}`;
document.head.appendChild(leafCSS);
