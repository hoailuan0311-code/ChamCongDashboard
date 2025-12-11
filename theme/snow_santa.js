/* ===========================================================
   ❄ SNOW + SANTA + REINDEER EFFECT
   =========================================================== */

/* ---------- Tạo Layer chứa hiệu ứng ---------- */
const effectLayer = document.createElement("div");
effectLayer.id = "theme-effect";
effectLayer.style.position = "fixed";
effectLayer.style.top = 0;
effectLayer.style.left = 0;
effectLayer.style.width = "100%";
effectLayer.style.height = "100%";
effectLayer.style.pointerEvents = "none";
effectLayer.style.zIndex = "999999";
document.body.appendChild(effectLayer);

/* ===========================================================
   ❄ HIỆU ỨNG TUYẾT RƠI
   =========================================================== */
function createSnow() {
    const snow = document.createElement("div");
    snow.innerHTML = "❄";
    snow.style.position = "absolute";
    snow.style.left = Math.random() * window.innerWidth + "px";
    snow.style.fontSize = 14 + Math.random() * 18 + "px";
    snow.style.opacity = Math.random();
    snow.style.animation = `snowFall ${4 + Math.random() * 5}s linear`;

    effectLayer.appendChild(snow);

    setTimeout(() => snow.remove(), 9000);
}
setInterval(createSnow, 180); // nhiều tuyết hơn bản cũ

/* animation CSS */
const snowStyle = document.createElement("style");
snowStyle.innerHTML = `
@keyframes snowFall {
    0% { transform: translateY(-20px); }
    100% { transform: translateY(100vh); }
}`;
document.head.appendChild(snowStyle);

/* ===========================================================
   🦌 TUẦN LỘC + 🎅 ÔNG GIÀ NOEL
   =========================================================== */

function createMovingCharacter(src, size = 150) {
    const img = document.createElement("img");
    img.src = src;
    img.style.position = "absolute";
    img.style.bottom = "10px";
    img.style.left = "-200px";
    img.style.width = size + "px";
    img.style.pointerEvents = "none";
    img.style.transition = "transform 0.2s";
    effectLayer.appendChild(img);

    let x = -200;
    let dir = 1; // chạy sang phải

    function move() {
        x += dir * 3;

        if (x > window.innerWidth) {
            dir = -1;
            img.style.transform = "scaleX(-1)";
        }
        if (x < -200) {
            dir = 1;
            img.style.transform = "scaleX(1)";
        }

        img.style.left = x + "px";
        requestAnimationFrame(move);
    }
    move();

    // Hiệu ứng té xuống khi scroll
    window.addEventListener("scroll", () => {
        img.style.bottom = Math.max(10, 10 - window.scrollY * 0.1) + "px";
    });

    return img;
}

// tạo 2 nhân vật
createMovingCharacter("theme/reindeer.png", 160);
createMovingCharacter("theme/santa.png", 150);
