// ✨ Hạt sáng lung linh
function sparkle() {
    const p = document.createElement("div");
    p.style.position = "fixed";
    p.style.left = Math.random()*100 + "vw";
    p.style.top = Math.random()*100 + "vh";
    p.style.width = p.style.height = "4px";
    p.style.background = "white";
    p.style.borderRadius = "50%";
    p.style.opacity = 1;
    p.style.pointerEvents = "none";
    p.style.zIndex = 99999;
    p.style.animation = "sparkleFade 2s linear";
    document.body.appendChild(p);
    setTimeout(()=>p.remove(),2000);
}
setInterval(sparkle,80);

const sparkCSS = document.createElement("style");
sparkCSS.innerHTML = `
@keyframes sparkleFade {
  from { opacity:1; transform: scale(1); }
  to { opacity:0; transform: scale(2); }
}`;
document.head.appendChild(sparkCSS);
