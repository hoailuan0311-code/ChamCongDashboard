/* =======================================================================
    NOEL SUPER EFFECT
    ❄ Snowfall + Snow Accumulation
    🎅 Santa snowboard + gift drop
    🦌 Reindeer drift + light trail
   ======================================================================= */

// ===================== GLOBAL LAYERS =====================
const layerTop = document.createElement("div");
layerTop.style.position = "fixed";
layerTop.style.top = 0;
layerTop.style.left = 0;
layerTop.style.width = "100%";
layerTop.style.height = "100%";
layerTop.style.pointerEvents = "none";
layerTop.style.zIndex = 99990;
document.body.appendChild(layerTop);

// Canvas tuyết đọng
const snowCanvas = document.createElement("canvas");
snowCanvas.width = innerWidth;
snowCanvas.height = 200; 
snowCanvas.style.position = "fixed";
snowCanvas.style.top = 0;
snowCanvas.style.left = 0;
snowCanvas.style.pointerEvents = "none";
snowCanvas.style.zIndex = 99995;
document.body.appendChild(snowCanvas);
const snowCtx = snowCanvas.getContext("2d");

let snowAcc = []; // tuyết đọng theo pixel


// Resize sync
window.addEventListener("resize", () => {
    snowCanvas.width = innerWidth;
});


// ===================== ❄ SNOW FALL + ACCUMULATION =====================
function createSnow() {
    const flake = document.createElement("div");
    flake.innerHTML = "❄";
    flake.style.position = "absolute";
    flake.style.left = Math.random() * innerWidth + "px";
    flake.style.top = "-20px";
    flake.style.fontSize = 10 + Math.random() * 18 + "px";
    flake.style.opacity = 0.5 + Math.random() * 0.5;
    flake.style.animation = `snowFall ${4 + Math.random() * 4}s linear`;

    layerTop.appendChild(flake);

    const t = 4000;
    const x = parseInt(flake.style.left);
    const size = parseInt(flake.style.fontSize);

    setTimeout(() => {
        accumulateSnow(x, size * 0.4);
        flake.remove();
    }, t);
}

setInterval(createSnow, 140);


// accumulate
function accumulateSnow(x, h) {
    const index = Math.floor(x);
    if (!snowAcc[index]) snowAcc[index] = 0;

    snowAcc[index] += h;

    if (snowAcc[index] > 70) {
        snowAcc[index] = 0;
        dropChunk(index);
    }

    drawSnowLayer();
}

function dropChunk(x) {
    const chunk = document.createElement("div");
    chunk.style.position = "fixed";
    chunk.style.top = "0px";
    chunk.style.left = x + "px";
    chunk.style.width = "6px";
    chunk.style.height = "6px";
    chunk.style.background = "#fff";
    chunk.style.borderRadius = "50%";
    chunk.style.zIndex = 99998;
    document.body.appendChild(chunk);

    let y = 0;
    function fall() {
        y += 6;
        chunk.style.top = y + "px";
        if (y < innerHeight - 30) requestAnimationFrame(fall);
        else chunk.remove();
    }
    fall();
}


function drawSnowLayer() {
    snowCtx.clearRect(0, 0, snowCanvas.width, snowCanvas.height);
    snowCtx.fillStyle = "#fff";

    for (let x = 0; x < snowCanvas.width; x++) {
        if (snowAcc[x] > 0) {
            snowCtx.fillRect(x, snowCanvas.height - snowAcc[x], 1, snowAcc[x]);
        }
    }
}


// CSS Animate
const css = document.createElement("style");
css.innerHTML = `
@keyframes snowFall {
    0% { transform: translateY(0); }
    100% { transform: translateY(110vh); }
}
`;
document.head.appendChild(css);


// ===================== 🎅 SANTA SNOWBOARD =====================
const santa = document.createElement("img");
santa.src = "theme/img/santa.png";
santa.style.position = "fixed";
santa.style.bottom = "40px";
santa.style.left = "-200px";
santa.style.width = "170px";
santa.style.zIndex = 99991;
santa.style.pointerEvents = "none";
document.body.appendChild(santa);

let santaX = -200;
let santaSpeed = 4;

function santaLoop() {
    santaX += santaSpeed;
    santa.style.left = santaX + "px";

    if (santaX > innerWidth + 200) {
        santaX = -200;
    }

    // random thả quà
    if (Math.random() < 0.02) dropGift(santaX + 60);

    requestAnimationFrame(santaLoop);
}
requestAnimationFrame(santaLoop);


// 🎁 quà rơi
function dropGift(x) {
    const gift = document.createElement("div");
    gift.style.position = "fixed";
    gift.style.left = x + "px";
    gift.style.top = "60px";
    gift.style.width = "15px";
    gift.style.height = "15px";
    gift.style.background = "gold";
    gift.style.borderRadius = "4px";
    gift.style.zIndex = 99992;
    document.body.appendChild(gift);

    let y = 60;
    function fall() {
        y += 5;
        gift.style.top = y + "px";

        if (y < innerHeight - 30) requestAnimationFrame(fall);
        else {
            sparkle(x, y);
            gift.remove();
        }
    }
    fall();
}

// ✨ nổ lấp lánh
function sparkle(x, y) {
    for (let i = 0; i < 12; i++) {
        const sp = document.createElement("div");
        sp.style.position = "fixed";
        sp.style.left = x + "px";
        sp.style.top = y + "px";
        sp.style.width = "4px";
        sp.style.height = "4px";
        sp.style.background = "yellow";
        sp.style.borderRadius = "50%";
        sp.style.zIndex = 99993;
        sp.style.opacity = 1;

        document.body.appendChild(sp);

        let angle = Math.random() * Math.PI * 2;
        let speed = 2 + Math.random() * 4;
        let life = 0;

        function anim() {
            life++;
            sp.style.left = x + Math.cos(angle) * life * speed + "px";
            sp.style.top  = y + Math.sin(angle) * life * speed + "px";
            sp.style.opacity = 1 - life / 30;

            if (life < 30) requestAnimationFrame(anim);
            else sp.remove();
        }
        anim();
    }
}


// ===================== 🦌 REINDEER DRIFT =====================
const deer = document.createElement("img");
deer.src = "theme/img/reindeer.png";
deer.style.position = "fixed";
deer.style.top = "20px";
deer.style.right = "-200px";
deer.style.width = "150px";
deer.style.zIndex = 99992;
deer.style.pointerEvents = "none";
document.body.appendChild(deer);

let deerX = -150;
let deerSpeed = 3;

function deerLoop() {
    deerX += deerSpeed;
    deer.style.right = deerX + "px";

    if (deerX > innerWidth + 200) {
        deerX = -200;
    }

    // vệt sáng drift nhẹ
    if (Math.random() < 0.3) lightTrail(parseInt(innerWidth - deerX + 40), 60);

    requestAnimationFrame(deerLoop);
}
requestAnimationFrame(deerLoop);


// vệt sáng
function lightTrail(x, y) {
    const dot = document.createElement("div");
    dot.style.position = "fixed";
    dot.style.left = x + "px";
    dot.style.top = y + "px";
    dot.style.width = "4px";
    dot.style.height = "4px";
    dot.style.background = "rgba(255,255,255,0.8)";
    dot.style.borderRadius = "50%";
    dot.style.zIndex = 99994;

    document.body.appendChild(dot);

    let opacity = 1;
    function fade() {
        opacity -= 0.03;
        dot.style.opacity = opacity;
        if (opacity > 0) requestAnimationFrame(fade);
        else dot.remove();
    }
    fade();
}
