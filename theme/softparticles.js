// 🌬️ Hạt sáng mờ bay lơ lửng
function softParticle() {
    const p = document.createElement("div");
    p.style.position = "fixed";
    p.style.left = Math.random()*100 + "vw";
    p.style.top = Math.random()*100 + "vh";
    p.style.width = p.style.height = 6 + "px";
    p.style.borderRadius = "50%";
    p.style.background = "rgba(255,255,255,0.5)";
    p.style.filter = "blur(2px)";
    p.style.animation = "softFloat 4s linear";
    p.style.pointerEvents = "none";
    p.style.zIndex = 99999;
    document.body.appendChild(p);
    setTimeout(()=>p.remove(),4000);
}
setInterval(softParticle,120);

const softCSS = document.createElement("style");
softCSS.innerHTML = `
@keyframes softFloat {
    from { opacity:1; transform: translateY(0); }
    to { opacity:0; transform: translateY(-40px); }
}`;
document.head.appendChild(softCSS);
