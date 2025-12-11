/* ===========================================================
   ❄ SNOW + SANTA SKI + REINDEER DRIFT + SNOW BUILDUP + GIFT EXPLOSION
   =========================================================== */

const layer = document.createElement("div");
layer.id = "theme-effect";
Object.assign(layer.style, {
    position: "fixed",
    top: 0, left: 0,
    width: "100%", height: "100%",
    pointerEvents: "none",
    zIndex: 999999
});
document.body.appendChild(layer);

/* ===========================================================
   ❄ TUYẾT RƠI
   =========================================================== */
function createSnow() {
    const s = document.createElement("div");
    s.innerHTML = "❄";
    s.style.position = "absolute";
    s.style.left = Math.random() * innerWidth + "px";
    s.style.fontSize = (10 + Math.random() * 14) + "px";
    s.style.opacity = 0.7;
    s.style.animation = `fallSnow ${6 + Math.random()*4}s linear`;
    s.style.color = "#fff";
    layer.appendChild(s);

    setTimeout(() => s.remove(), 12000);
}
setInterval(createSnow, 120);

const snowFallCSS = document.createElement("style");
snowFallCSS.innerHTML = `
@keyframes fallSnow {
    from { transform: translateY(-20px); }
    to   { transform: translateY(100vh); }
}`;
document.head.appendChild(snowFallCSS);

/* ===========================================================
   ⛄ TUYẾT ĐÓNG THÀNH MẢNG Ở MÉP UI
   =========================================================== */
const snowEdges = document.createElement("div");
snowEdges.style.position = "fixed";
snowEdges.style.bottom = "0";
snowEdges.style.left = "0";
snowEdges.style.width = "100%";
snowEdges.style.height = "0px";
snowEdges.style.background = "rgba(255,255,255,0.9)";
snowEdges.style.transition = "height 0.4s";
snowEdges.style.pointerEvents = "none";
snowEdges.style.zIndex = 999998;
document.body.appendChild(snowEdges);

let snowLevel = 0;
setInterval(() => {
    snowLevel += 2;
    if (snowLevel > 80) {
        snowLevel = 0;
        snowEdges.style.height = "0px";
        return;
    }
    snowEdges.style.height = snowLevel + "px";
}, 3000);

/* ===========================================================
   🦌 NHÂN VẬT CHUYỂN ĐỘNG + DRIFT
   =========================================================== */
function createCharacter(src, size = 150, driftTrail = false) {
    const img = document.createElement("img");
    img.src = src;
    Object.assign(img.style, {
        position: "absolute",
        bottom: "30px",
        left: Math.random()*innerWidth + "px",
        width: size + "px",
        pointerEvents: "none"
    });
    layer.appendChild(img);

    let x = parseFloat(img.style.left);
    let y = 30;
    let vx = 3 + Math.random()*2;
    let vy = 0;
    let flip = 1;

    function update() {
        x += vx;
        y += vy;

        if (x + size > innerWidth) { vx = -vx; flip = -1; }
        if (x < 0) { vx = -vx; flip = 1; }

        if (y > 30) y = 30;

        img.style.left = x + "px";
        img.style.bottom = y + "px";
        img.style.transform = `scaleX(${flip})`;

        // DRIFT EFFECT
        if (driftTrail) {
            const t = document.createElement("div");
            t.style.position = "absolute";
            t.style.left = (x + size/2) + "px";
            t.style.bottom = (y + 10) + "px";
            t.style.width = "20px";
            t.style.height = "4px";
            t.style.background = `hsl(${(Date.now()/10)%360},90%,75%)`;
            t.style.opacity = "0.8";
            t.style.borderRadius = "20px";
            t.style.animation = "trailFade 0.4s linear";
            layer.appendChild(t);
            setTimeout(()=>t.remove(), 400);
        }

        requestAnimationFrame(update);
    }
    update();

    return { img, getX:()=>x, getY:()=>y, setVy:(v)=>vy=v };
}

const trailCSS = document.createElement("style");
trailCSS.innerHTML = `
@keyframes trailFade {
    from { transform: scaleX(1); opacity:0.8; }
    to   { transform: scaleX(3); opacity:0; }
}`;
document.head.appendChild(trailCSS);

/* ===========================================================
   🎅 SANTA TRƯỢT VÁN TUYẾT
   =========================================================== */
const santa = createCharacter("theme/santa.png", 150, false);
santa.img.style.transform += " rotate(-10deg)";

/* ===========================================================
   🦌 REINDEER DRIFT + VỆT SÁNG RAINBOW
   =========================================================== */
const deer = createCharacter("theme/reindeer.png", 160, true);

/* BAY NHẸ RỒI HẠ CÁNH */
setInterval(() => {
    deer.setVy(5);
    setTimeout(()=> deer.setVy(-5), 900);
}, 14000);

/* ===========================================================
   🎁 QUÀ RƠI + NỔ LẤP LÁNH
   =========================================================== */
function dropGift() {
    const g = document.createElement("div");
    g.innerHTML = "🎁";
    g.style.position = "absolute";
    g.style.left = santa.getX() + 60 + "px";
    g.style.bottom = santa.getY() + 120 + "px";
    g.style.fontSize = "32px";
    g.style.animation = "giftDrop 1.6s linear";
    layer.appendChild(g);

    setTimeout(() => {
        g.remove();
        explode(santa.getX() + 60, 30);
    }, 1500);
}
setInterval(dropGift, 7000 + Math.random()*3000);

const giftDropCSS = document.createElement("style");
giftDropCSS.innerHTML = `
@keyframes giftDrop {
    from { transform: translateY(0) rotate(0deg); opacity:1; }
    to   { transform: translateY(-150px) rotate(160deg); opacity:0; }
}`;
document.head.appendChild(giftDropCSS);

/* ===========================================================
   💥 VỤ NỔ LẤP LÁNH
   =========================================================== */
function explode(x, y) {
    for (let i=0; i<14; i++) {
        const p = document.createElement("div");
        p.style.position = "absolute";
        p.style.left = x + "px";
        p.style.bottom = y + "px";
        p.style.width = "6px";
        p.style.height = "6px";
        p.style.borderRadius = "50%";
        p.style.background = `hsl(${Math.random()*360},90%,70%)`;
        p.style.opacity = 1;

        const angle = Math.random()*Math.PI*2;
        const dist = 40 + Math.random()*60;

        p.animate([
            { transform: "translate(0,0)", opacity:1 },
            { transform: `translate(${Math.cos(angle)*dist}px, ${Math.sin(angle)*dist}px)`, opacity: 0 }
        ], { duration: 800, easing: "ease-out" });

        layer.appendChild(p);
        setTimeout(()=>p.remove(), 900);
    }
}
