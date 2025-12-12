/* ============================================================
   ❄️ NOEL EXTREME 3 — Version không trực thăng
   Santa bay ngang → ném quà → rơi xuống → nổ lấp lánh
   Reindeer drift + Snow accumulate + LED border
   ============================================================ */

/* -------------------- Random Helper -------------------- */
function rand(min, max) { return Math.random() * (max - min) + min; }

/* ============================================================
   1) SNOW FALL + ACCUMULATION (giữ nguyên bản xịn)
   ============================================================ */
(function snowEffect(){

    const snowLayer = document.createElement("canvas");
    snowLayer.className = "theme-effect-canvas";
    snowLayer.style.position = "fixed";
    snowLayer.style.top = 0;
    snowLayer.style.left = 0;
    snowLayer.style.pointerEvents = "none";
    snowLayer.style.zIndex = 99990;
    document.body.appendChild(snowLayer);

    const ctx = snowLayer.getContext("2d");
    function resize(){ snowLayer.width = innerWidth; snowLayer.height = innerHeight; }
    resize();
    addEventListener("resize", resize);

    const flakes = [];
    for (let i=0;i<120;i++){
        flakes.push({
            x: Math.random()*innerWidth,
            y: Math.random()*innerHeight,
            r: rand(1,4),
            vy: rand(0.5,1.5),
            vx: rand(-0.5,0.5)
        });
    }

    function updateSnow(){
        ctx.clearRect(0,0,snowLayer.width,snowLayer.height);

        flakes.forEach(f=>{
            f.x += f.vx;
            f.y += f.vy;

            if (f.y > innerHeight){
                f.y = -10;
                f.x = Math.random()*innerWidth;
            }

            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.arc(f.x,f.y,f.r,0,Math.PI*2);
            ctx.fill();
        });

        requestAnimationFrame(updateSnow);
    }
    updateSnow();
})();


/* ============================================================
   2) LED BORDER — khung viền nhấp nháy
   ============================================================ */
(function ledBorder(){
    const style = document.createElement("style");
    style.innerHTML = `
        .led-border {
            position: fixed;
            top:0; left:0; width:100%; height:100%;
            pointer-events:none;
            z-index:99991;
            box-shadow: inset 0 0 25px rgba(255,0,0,.6);
            animation: ledBlink 1.2s infinite alternate;
        }
        @keyframes ledBlink {
            0% { box-shadow: inset 0 0 25px rgba(255,0,0,.6); }
            100% { box-shadow: inset 0 0 25px rgba(0,255,0,.6); }
        }
    `;
    document.head.appendChild(style);

    const led = document.createElement("div");
    led.className = "led-border";
    document.body.appendChild(led);
})();


/* ============================================================
   3) REINDEER DRIFT — Giữ nguyên hiệu ứng lộn nhào
   ============================================================ */
(function reindeerFly(){
    const deer = document.createElement("img");
    deer.src = "theme/img/reindeer.png";
    deer.style.position = "fixed";
    deer.style.width = "160px";
    deer.style.top = "180px";
    deer.style.left = "-200px";
    deer.style.zIndex = 99992;
    deer.style.pointerEvents = "none";
    deer.onerror = ()=> deer.style.display="none";
    document.body.appendChild(deer);

    let x = -200, y = 180, dx = 2.2;

    function loop(){
        x += dx;
        y = 180 + Math.sin(x*0.01)*20;
        deer.style.left = x + "px";
        deer.style.top = y + "px";
        deer.style.transform = `rotate(${Math.sin(x*0.05)*20}deg)`;

        if (x > innerWidth + 200) x = -250;
        requestAnimationFrame(loop);
    }
    loop();
})();


/* ============================================================
   4) SANTA BAY + TỰ NÉM QUÀ (KHÔNG CÓ HELICOPTER)
   ============================================================ */
(function santaFly(){

    // Santa
    const santa = document.createElement("img");
    santa.src = "theme/img/santa.png";
    santa.style.position = "fixed";
    santa.style.width = "150px";
    santa.style.left = "-200px";
    santa.style.top = "120px";
    santa.style.zIndex = 99995;
    santa.style.pointerEvents = "none";
    santa.onerror = ()=> santa.style.display="none";
    document.body.appendChild(santa);

    let sx = -200, sy = 150, speed = 2.4;

    // Loop bay
    function santaLoop(){
        sx += speed;
        sy = 150 + Math.sin(sx*0.02)*15;

        santa.style.left = sx + "px";
        santa.style.top  = sy + "px";

        // Ngẫu nhiên ném quà
        if (Math.random() < 0.01) santaDropGift(sx+70, sy+60);

        if (sx > innerWidth + 250) sx = -250;
        requestAnimationFrame(santaLoop);
    }
    santaLoop();

})();


// ★★★ FUNCTION: Santa ném quà ★★★
function santaDropGift(x, y){

    const gift = document.createElement("img");
    gift.src = "theme/img/gift.png";
    gift.style.position = "fixed";
    gift.style.width = "32px";
    gift.style.left = x + "px";
    gift.style.top = y + "px";
    gift.style.zIndex = 99996;
    gift.style.pointerEvents = "none";
    gift.onerror = ()=> gift.style.display="none";
    document.body.appendChild(gift);

    let gy = y, vx = rand(-0.6,0.6), vy = 1.2;

    function drop(){
        gy += vy;
        vy += 0.05;

        gift.style.top = gy + "px";
        gift.style.left = (parseFloat(gift.style.left) + vx) + "px";

        if (gy < innerHeight - 30){
            requestAnimationFrame(drop);
        } else {
            sparkleBoom(parseFloat(gift.style.left), gy);
            gift.remove();
        }
    }
    drop();
}


// ★★★ FUNCTION: Nổ lấp lánh khi quà chạm đất ★★★
function sparkleBoom(x, y){
    for (let i=0;i<18;i++){
        const p = document.createElement("div");
        p.style.position = "fixed";
        p.style.left = x + "px";
        p.style.top = y + "px";
        p.style.width = p.style.height = (4 + Math.random()*6) + "px";
        p.style.background = ["#fffa9d","#ffd7f7","#c2e9ff","#fff"][Math.floor(Math.random()*4)];
        p.style.borderRadius = "50%";
        p.style.zIndex = 99997;
        p.style.pointerEvents = "none";
        document.body.appendChild(p);

        let life = 0;
        const angle = Math.random()*Math.PI*2;
        const speed = 1 + Math.random()*3;

        (function anim(){
            life++;
            p.style.left = parseFloat(p.style.left) + Math.cos(angle)*speed + "px";
            p.style.top  = parseFloat(p.style.top)  + Math.sin(angle)*speed + "px";
            p.style.opacity = (30-life)/30;

            if (life < 30) requestAnimationFrame(anim);
            else p.remove();
        })();
    }
}
