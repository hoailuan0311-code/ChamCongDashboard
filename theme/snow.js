// ❄ Hiệu ứng tuyết rơi
const snowContainer = document.createElement("div");
snowContainer.style.position = "fixed";
snowContainer.style.top = 0;
snowContainer.style.left = 0;
snowContainer.style.width = "100%";
snowContainer.style.height = "100%";
snowContainer.style.pointerEvents = "none";
snowContainer.style.zIndex = 9999;
document.body.appendChild(snowContainer);

function createSnow() {
    const snow = document.createElement("div");
    snow.innerHTML = "❄";
    snow.style.position = "absolute";
    snow.style.left = Math.random() * window.innerWidth + "px";
    snow.style.fontSize = 14 + Math.random() * 18 + "px";
    snow.style.opacity = Math.random();
    snow.style.animation = `fall ${4 + Math.random() * 5}s linear`;

    snowContainer.appendChild(snow);

    setTimeout(() => snow.remove(), 9000);
}

setInterval(createSnow, 200);

const style = document.createElement("style");
style.innerHTML = `
@keyframes fall {
    0% { transform: translateY(-10px); }
    100% { transform: translateY(100vh); }
}`;
document.head.appendChild(style);
