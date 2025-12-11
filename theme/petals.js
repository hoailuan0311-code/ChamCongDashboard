// 🌸 Petals rơi (hoa hồng)
function createPetal() {
    const el = document.createElement("div");
    el.innerHTML = "🌸";
    el.style.position = "fixed";
    el.style.left = Math.random()*100 + "vw";
    el.style.top = "-20px";
    el.style.fontSize = 18 + Math.random()*14 + "px";
    el.style.pointerEvents = "none";
    el.style.animation = "petalFall 7s linear";
    el.style.zIndex = 99999;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),7000);
}
setInterval(createPetal,220);

const petalsCSS = document.createElement("style");
petalsCSS.innerHTML = `
@keyframes petalFall {
  0% { transform: translateY(0) rotate(0deg); }
  100% { transform: translateY(110vh) rotate(360deg); }
}`;
document.head.appendChild(petalsCSS);
