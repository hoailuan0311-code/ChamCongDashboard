// 🌞 Tia nắng loang nhẹ
const ray = document.createElement("div");
ray.style.position = "fixed";
ray.style.top = 0;
ray.style.left = 0;
ray.style.width = "100vw";
ray.style.height = "100vh";
ray.style.pointerEvents = "none";
ray.style.zIndex = 99998;
ray.style.background = "radial-gradient(circle at 20% 20%, rgba(255,255,200,0.25), transparent 70%)";
ray.style.animation = "sunRotate 12s infinite linear";
document.body.appendChild(ray);

const sunCSS = document.createElement("style");
sunCSS.innerHTML = `
@keyframes sunRotate {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}`;
document.head.appendChild(sunCSS);
