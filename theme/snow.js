// ===================== ❄ SNOW FALL =====================
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
    snow.style.fontSize = 12 + Math.random() * 24 + "px";
    snow.style.opacity = Math.random();
    snow.style.animation = `fall ${4 + Math.random() * 6}s linear`;

    snowContainer.appendChild(snow);

    setTimeout(() => snow.remove(), 9000);
}

setInterval(createSnow, 200);

const snowStyle = document.createElement("style");
snowStyle.innerHTML = `
@keyframes fall {
    0% { transform: translateY(-10px); }
    100% { transform: translateY(100vh); }
}
`;
document.head.appendChild(snowStyle);


// ===================== 🎅 SANTA & 🦌 REINDEER ANIMATION =====================

// Create a dedicated layer
const layer = document.createElement("div");
layer.style.position = "fixed";
layer.style.top = 0;
layer.style.left = 0;
layer.style.width = "100%";
layer.style.height = "100%";
layer.style.pointerEvents = "none";
layer.style.zIndex = 99998;
document.body.appendChild(layer);


// ===================== 🦌 REINDEER (tuần lộc chạy dưới đất) =====================
function createReindeer() {
    const deer = document.createElement("img");
    deer.src = "https://i.imgur.com/Y7EFJDa.png"; // tuần lộc PNG (trong suốt)
    deer.style.position = "absolute";
    deer.style.bottom = "0px";
    deer.style.left = "-150px";
    deer.style.width = "140px";
    deer.style.transition = "transform 0.2s";
    layer.appendChild(deer);

    let x = -150;
    let speed = 3 + Math.random() * 2;
    let dx = speed;
    let gravity = 0;
    let vy = 0;
    let falling = false;

    function move() {
        const W = window.innerWidth;
        const H = window.innerHeight;

        // Scroll → thêm gravity
        if (falling) {
            vy += 0.8;
            deer.style.bottom = Math.max(0, parseFloat(deer.style.bottom) - vy) + "px";

            // chạm đất → đứng dậy
            if (parseFloat(deer.style.bottom) <= 0) {
                falling = false;
                vy = 0;
            }
        }

        x += dx;
        deer.style.left = x + "px";

        // Va chạm 2 bên
        if (x > W - 120) dx = -speed;
        if (x < -20) dx = speed;

        requestAnimationFrame(move);
    }

    // Khi user scroll mạnh → té xuống
    window.addEventListener("scroll", () => {
        falling = true;
        vy = Math.random() * 4 + 2;
    });

    move();
}

setTimeout(createReindeer, 1000);
setInterval(createReindeer, 12000);



// ===================== 🎅 SANTA FLYING (bay ngang trời) =====================
function createSanta() {
    const santa = document.createElement("img");
    santa.src = "https://i.imgur.com/3oZ5lmb.png"; // ông già Noel PNG
    santa.style.position = "absolute";
    santa.style.top = Math.random() * 200 + "px";
    santa.style.left = "-200px";
    santa.style.width = "200px";
    layer.appendChild(santa);

    let x = -200;
    let speed = 4 + Math.random() * 2;

    function fly() {
        x += speed;
        santa.style.left = x + "px";

        if (x > window.innerWidth + 200) {
            santa.remove();
        } else {
            requestAnimationFrame(fly);
        }
    }

    fly();
}

setInterval(createSanta, 15000);
createSanta();
