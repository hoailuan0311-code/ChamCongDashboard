/* ===========================================================
   NOEL EXTREME EDITION 🎄 
   - Santa Parkour Snowboard
   - Reindeer Front/Back Flip
   - Snow Accumulation on UI Corners
   - LED Noel Blinking Border
   =========================================================== */

// ===================== LAYERS =====================
const topLayer = document.createElement("div");
topLayer.style.position = "fixed";
topLayer.style.top = 0;
topLayer.style.left = 0;
topLayer.style.width = "100%";
topLayer.style.height = "100%";
topLayer.style.pointerEvents = "none";
topLayer.style.zIndex = 99990;
document.body.appendChild(topLayer);

// Canvas tuyết đọng UI
const uiSnowCanvas = document.createElement("canvas");
uiSnowCanvas.style.position = "fixed";
uiSnowCanvas.style.top = "0";
uiSnowCanvas.style.left = "0";
uiSnowCanvas.style.pointerEvents = "none";
uiSnowCanvas.style.zIndex = 99992;
document.body.appendChild(uiSnowCanvas);
const uiCtx = uiSnowCanvas.getContext("2d");

function resizeCanvas(){
    uiSnowCanvas.width = window.innerWidth;
    uiSnowCanvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

let uiSnow = []; // tuyết bám UI


// ===================== ❄ SNOWFALL + UI ACCUMULATION =====================
function createSnow(){
    const flake = document.createElement("div");
    flake.innerHTML = "❄";
    flake.style.position = "absolute";
    flake.style.left = Math.random() * innerWidth + "px";
    flake.style.top = "-30px";
    flake.style.fontSize = 10 + Math.random() * 20 + "px";
    flake.style.opacity = 0.6 + Math.random() * 0.4;
    flake.style.animation = `fall ${4 + Math.random()*4}s linear`;
    topLayer.appendChild(flake);

    const x = parseInt(flake.style.left);
    const size = parseInt(flake.style.fontSize);

    setTimeout(() => {
        accumulateUI(x, size * 0.4);
        flake.remove();
    }, 5000);
}
setInterval(createSnow, 120);


// UI snow accumulate
function accumulateUI(x, h){
    if (!uiSnow[x]) uiSnow[x] = 0;

    uiSnow[x] += h;
    if (uiSnow[x] > 50) uiSnow[x] = 50;

    drawUISnow();
}

function drawUISnow(){
    uiCtx.clearRect(0, 0, uiSnowCanvas.width, uiSnowCanvas.height);
    uiCtx.fillStyle = "#fff";

    // tuyết bám HEADER + TABLE
    for (let x=0; x<uiSnowCanvas.width; x++){
        if (uiSnow[x] > 0){
            uiCtx.fillRect(x, 0, 1, uiSnow[x]);                  // đọng trên đầu màn hình
            uiCtx.fillRect(x, 80, 1, uiSnow[x] * 0.4);           // đọng trên header
            uiCtx.fillRect(x, innerHeight - 50, 1, uiSnow[x]*0.2); // đọng cuối UI
        }
    }
}


// ===================== 🎅 SANTA PARKOUR STYLE =====================
const santa = document.createElement("img");
santa.src = "theme/img/santa.png";
santa.style.position = "fixed";
santa.style.bottom = "20px";
santa.style.left = "-180px";
santa.style.width = "170px";
santa.style.zIndex = 99995;
santa.style.pointerEvents = "none";
document.body.appendChild(santa);

let santaX = -200;
let santaSpeed = 6;

function santaLoop(){
    santaX += santaSpeed;
    santa.style.left = santaX + "px";

    // Parkour random
    const r = Math.random();
    if (r < 0.01) santaFlip360();
    else if (r < 0.02) santaJump();
    else if (r < 0.03) santaTilt();

    // reset
    if (santaX > innerWidth + 300) santaReset();

    requestAnimationFrame(santaLoop);
}
requestAnimationFrame(santaLoop);

function santaReset(){
    santaX = -200;
    santa.style.transform = "rotate(0deg) scaleX(1)";
}

function santaFlip360(){
    santa.style.transition = "transform 0.9s ease";
    santa.style.transform = "rotate(360deg)";
    setTimeout(()=>{ santa.style.transform = "rotate(0deg)"; }, 900);
}

function santaJump(){
    santa.style.transition = "transform 0.4s ease";
    santa.style.transform = "translateY(-40px)";
    setTimeout(()=> santa.style.transform = "translateY(0)", 400);
}

function santaTilt(){
    santa.style.transition = "transform 0.3s ease";
    santa.style.transform = "rotate(20deg)";
    setTimeout(()=> santa.style.transform = "rotate(0deg)", 300);
}


// ===================== 🦌 REINDEER FLIP =====================
const deer = document.createElement("img");
deer.src = "theme/img/reindeer.png";
deer.style.position = "fixed";
deer.style.top = "60px";
deer.style.right = "-200px";
deer.style.width = "160px";
deer.style.zIndex = 99994;
deer.style.pointerEvents = "none";
document.body.appendChild(deer);

let deerPos = -200;
let deerSpeed = 5;

function deerLoop(){
    deerPos += deerSpeed;
    deer.style.right = deerPos + "px";

    // random flip
    const r = Math.random();
    if (r < 0.015) deerFlipForward();
    else if (r < 0.03) deerFlipBack();

    if (deerPos > innerWidth + 300) deerReset();

    requestAnimationFrame(deerLoop);
}
requestAnimationFrame(deerLoop);

function deerReset(){
    deerPos = -200;
    deer.style.transform = "rotate(0deg)";
}

function deerFlipForward(){
    deer.style.transition = "transform 0.6s ease";
    deer.style.transform = "rotateX(360deg)";
    setTimeout(()=> deer.style.transform = "rotateX(0deg)", 600);
}

function deerFlipBack(){
    deer.style.transition = "transform 0.6s ease";
    deer.style.transform = "rotateY(360deg)";
    setTimeout(()=> deer.style.transform = "rotateY(0deg)", 600);
}


// ===================== 🎄 LED BORDER AROUND UI =====================
const led = document.createElement("div");
led.style.position = "fixed";
led.style.top = 0;
led.style.left = 0;
led.style.width = "100%";
led.style.height = "100%";
led.style.pointerEvents = "none";
led.style.zIndex = 99999;
document.body.appendChild(led);

const ledStyle = document.createElement("style");
ledStyle.innerHTML = `
@keyframes blink {
  0% { opacity: 0.2; }
  50% { opacity: 1; }
  100% { opacity: 0.3; }
}
.noel-led {
  position: absolute;
  width: 10px;
  height: 10px;
  background: radial-gradient(circle, #ff0000, #aa0000);
  border-radius: 50%;
  animation: blink 1s infinite;
}
`;
document.head.appendChild(ledStyle);

function createLED(){
    const dot = document.createElement("div");
    dot.className = "noel-led";
    dot.style.top = Math.random() < 0.5 ? "0px" : (innerHeight - 10) + "px";
    dot.style.left = Math.random() * innerWidth + "px";

    // đổi màu ngẫu nhiên
    const c = ["red", "yellow", "cyan", "green"];
    dot.style.background = c[Math.floor(Math.random()*4)];

    led.appendChild(dot);
}
setInterval(createLED, 150);
