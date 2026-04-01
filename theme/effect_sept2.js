// =================== Quốc Khánh 2/9 – Effect ===================

(function () {

// ─── CSS ─────────────────────────────────────────────────────────────────────
const style = document.createElement("style");
style.innerHTML = `
@keyframes flagWave92 {
    0%   { transform: skewY(0deg) scaleX(1); }
    25%  { transform: skewY(2.5deg) scaleX(0.96); }
    50%  { transform: skewY(-1.5deg) scaleX(1.03); }
    75%  { transform: skewY(2deg) scaleX(0.97); }
    100% { transform: skewY(0deg) scaleX(1); }
}
@keyframes bannerIn92 {
    0%   { opacity: 0; transform: translateX(-50%) scale(0.82) translateY(-20px); }
    60%  { opacity: 1; transform: translateX(-50%) scale(1) translateY(0); }
    82%  { opacity: 1; }
    100% { opacity: 0; }
}
@keyframes poleGlow {
    0%,100% { filter: drop-shadow(0 0 4px rgba(255,215,0,0.4)); }
    50%      { filter: drop-shadow(0 0 10px rgba(255,215,0,0.8)); }
}
`;
document.head.appendChild(style);

// ─── BANNER (lặp mỗi 35s) ────────────────────────────────────────────────────
function showBanner() {
    const banner = document.createElement("div");
    Object.assign(banner.style, {
        position: "fixed", top: "7%", left: "50%",
        transform: "translateX(-50%)",
        textAlign: "center", pointerEvents: "none",
        zIndex: "99999", fontFamily: "'Be Vietnam Pro', Georgia, serif",
        opacity: "0", whiteSpace: "nowrap",
        animation: "bannerIn92 8s ease forwards 0.4s",
    });
    banner.innerHTML = `
        <div style="font-size:clamp(14px,2vw,20px);color:#ffd700;
            letter-spacing:8px;text-transform:uppercase;
            text-shadow:0 0 20px rgba(255,215,0,0.7),0 2px 10px rgba(0,0,0,0.9);
            margin-bottom:6px">
            Cộng Hòa Xã Hội Chủ Nghĩa Việt Nam
        </div>
        <div style="font-size:clamp(50px,9vw,100px);font-weight:900;color:#ffd700;
            letter-spacing:4px;line-height:1;
            text-shadow:0 0 50px rgba(255,215,0,0.65),0 0 20px rgba(255,100,0,0.5),0 5px 20px rgba(0,0,0,0.9)">
            2/9
        </div>
        <div style="font-size:clamp(14px,2.2vw,22px);color:#ffecaa;
            letter-spacing:5px;text-transform:uppercase;margin-top:8px;
            text-shadow:0 2px 12px rgba(0,0,0,0.9)">
            Quốc Khánh Việt Nam
        </div>
        <div style="font-size:clamp(11px,1.6vw,17px);color:rgba(255,230,100,0.75);
            letter-spacing:3px;margin-top:5px">
            2 tháng 9 năm 1945 — Độc lập – Tự do – Hạnh phúc
        </div>`;
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 9500);
}
showBanner();
setInterval(showBanner, 35000);

// ─── CỜ VIỆT NAM (luôn hiện) ──────────────────────────────────────────────────
const STAR = "1.5,0.28 1.655,0.77 2.17,0.77 1.758,1.055 1.91,1.545 1.5,1.26 1.09,1.545 1.242,1.055 0.83,0.77 1.345,0.77";

function createFlag(rightOffset, delay) {
    const pole = document.createElement("div");
    Object.assign(pole.style, {
        position: "fixed", top: "3%", right: rightOffset,
        width: "3px", height: "clamp(65px,10vw,120px)",
        background: "linear-gradient(to bottom,#e8c96a,#b89040,#c8a050)",
        borderRadius: "2px 2px 0 0", zIndex: "99997", pointerEvents: "none",
        animation: "poleGlow 3s ease-in-out infinite",
    });
    document.body.appendChild(pole);

    const flag = document.createElement("div");
    Object.assign(flag.style, {
        position: "fixed", top: "3%", right: rightOffset,
        width: "clamp(70px,9vw,120px)", height: "clamp(47px,6vw,80px)",
        transformOrigin: "left center", zIndex: "99998", pointerEvents: "none",
        animation: `flagWave92 ${2 + delay * 0.3}s ease-in-out ${delay}s infinite`,
        filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.6))",
    });
    flag.innerHTML = `<svg viewBox="0 0 3 2" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
        <rect width="3" height="2" fill="#da251d"/>
        <polygon fill="#ffff00" points="${STAR}"/>
    </svg>`;
    document.body.appendChild(flag);
}

createFlag("3vw",   0);
createFlag("calc(3vw + clamp(78px,10.5vw,132px))", 0.6);

// ─── PHÁO HOA CANVAS (trong suốt) ────────────────────────────────────────────
const cvs = document.createElement("canvas");
Object.assign(cvs.style, {
    position: "fixed", inset: "0", width: "100%", height: "100%",
    pointerEvents: "none", zIndex: "99995", background: "transparent",
});
cvs.width  = window.innerWidth;
cvs.height = window.innerHeight;
document.body.appendChild(cvs);
const fx = cvs.getContext("2d");
window.addEventListener("resize", () => {
    cvs.width  = window.innerWidth;
    cvs.height = window.innerHeight;
});

const parts = [];

// Palette: đỏ + vàng + trắng (màu Quốc Khánh)
const PALETTES = [
    [45,  55],   // vàng kim
    [35,  48],   // vàng cam
    [0,   10],   // đỏ tươi
    [355, 365],  // đỏ hồng
    [55,  65],   // vàng nhạt
    [0,   5],    // trắng đỏ (high lightness)
];

function burst(x, y, scale = 1) {
    const [h1, h2] = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    const n = Math.floor((55 + Math.random() * 40) * scale);
    for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 / n) * i + (Math.random() - 0.5) * 0.4;
        const s = (2 + Math.random() * 5) * scale;
        parts.push({
            x, y,
            vx: Math.cos(a) * s,
            vy: Math.sin(a) * s,
            life: 1,
            decay: 0.011 + Math.random() * 0.014,
            r: (1 + Math.random() * 2.2) * scale,
            hue: h1 + Math.random() * (h2 - h1),
            sat: 95 + Math.random() * 5,
            lit: 75 + Math.random() * 20,
            trail: [],
        });
    }
}

// Rocket: bay lên rồi nổ
function launchRocket(x, targetY) {
    const rocket = { x, y: cvs.height, vy: -(8 + Math.random() * 5), targetY, trail: [] };

    function animateRocket() {
        rocket.y += rocket.vy;
        rocket.vy *= 0.985;
        rocket.trail.push({ x: rocket.x, y: rocket.y });
        if (rocket.trail.length > 12) rocket.trail.shift();

        fx_rocket.clearRect(0, 0, cvs.width, cvs.height);
        for (let j = 0; j < rocket.trail.length; j++) {
            const t = rocket.trail[j];
            const alpha = (j / rocket.trail.length) * 0.9;
            fx_rocket.beginPath();
            fx_rocket.arc(t.x, t.y, 2.5 * (j / rocket.trail.length), 0, Math.PI * 2);
            fx_rocket.fillStyle = `rgba(255,220,80,${alpha})`;
            fx_rocket.fill();
        }

        if (rocket.y <= rocket.targetY) {
            cvs_rocket.style.display = "none";
            burst(rocket.x, rocket.y, 1.1);
            playBoom();
        } else {
            requestAnimationFrame(animateRocket);
            cvs_rocket.style.display = "block";
        }
    }
    animateRocket();
}

// Canvas riêng cho rocket trail (để không conflict clearRect)
const cvs_rocket = document.createElement("canvas");
Object.assign(cvs_rocket.style, {
    position: "fixed", inset: "0", width: "100%", height: "100%",
    pointerEvents: "none", zIndex: "99994", background: "transparent",
    display: "none",
});
cvs_rocket.width  = window.innerWidth;
cvs_rocket.height = window.innerHeight;
document.body.appendChild(cvs_rocket);
const fx_rocket = cvs_rocket.getContext("2d");
window.addEventListener("resize", () => {
    cvs_rocket.width  = window.innerWidth;
    cvs_rocket.height = window.innerHeight;
});

function drawFX() {
    fx.clearRect(0, 0, cvs.width, cvs.height);
    for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 8) p.trail.shift();
        p.x += p.vx; p.y += p.vy;
        p.vy += 0.065; p.vx *= 0.987;
        p.life -= p.decay;
        if (p.life <= 0) { parts.splice(i, 1); continue; }

        for (let j = 0; j < p.trail.length; j++) {
            const t = p.trail[j];
            const ratio = j / p.trail.length;
            fx.beginPath();
            fx.arc(t.x, t.y, p.r * ratio * 0.6, 0, Math.PI * 2);
            fx.fillStyle = `hsla(${p.hue},${p.sat}%,${p.lit}%,${ratio * p.life * 0.4})`;
            fx.fill();
        }
        fx.beginPath();
        fx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        fx.fillStyle = `hsla(${p.hue},${p.sat}%,${p.lit}%,${p.life})`;
        fx.fill();
    }
    requestAnimationFrame(drawFX);
}
drawFX();

const randX = () => cvs.width  * (0.1 + Math.random() * 0.8);
const randY = () => cvs.height * (0.05 + Math.random() * 0.42);

// Burst ngay lập tức (không rocket) cho đợt đầu
burst(randX(), randY(), 1.1);
setTimeout(() => burst(randX(), randY()), 400);
setTimeout(() => burst(randX(), randY()), 800);

// Sau đó dùng rocket launch
setInterval(() => {
    const x = randX();
    const y = randY();
    launchRocket(x, y);
    setTimeout(() => {
        launchRocket(randX(), randY());
    }, 600);
}, 2000);

// ─── WEB AUDIO: BOOM + CROWD ──────────────────────────────────────────────────
let audioCtx = null;
function getAC() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function playBoom() {
    try {
        const ac = getAC();
        const now = ac.currentTime;

        // Tiếng thùm nổ: noise burst qua low-pass filter
        const bufSize = Math.floor(ac.sampleRate * 0.6);
        const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 2.5);
        }
        const src = ac.createBufferSource();
        src.buffer = buf;

        const lpf = ac.createBiquadFilter();
        lpf.type = "lowpass";
        lpf.frequency.value = 280;
        lpf.Q.value = 1.2;

        const hpf = ac.createBiquadFilter();
        hpf.type = "highpass";
        hpf.frequency.value = 40;

        const boomGain = ac.createGain();
        boomGain.gain.setValueAtTime(0.55, now);
        boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

        src.connect(lpf);
        lpf.connect(hpf);
        hpf.connect(boomGain);
        boomGain.connect(ac.destination);
        src.start(now);

        // Crackle (tiếng pháo lép) sau boom
        setTimeout(() => {
            try {
                const n = 4 + Math.floor(Math.random() * 5);
                for (let i = 0; i < n; i++) {
                    setTimeout(() => {
                        const ac2 = getAC();
                        const t = ac2.currentTime;
                        const bCrk = ac2.createBuffer(1, Math.floor(ac2.sampleRate * 0.05), ac2.sampleRate);
                        const d = bCrk.getChannelData(0);
                        for (let j = 0; j < d.length; j++) d[j] = (Math.random() * 2 - 1) * (1 - j / d.length);
                        const sCrk = ac2.createBufferSource();
                        sCrk.buffer = bCrk;
                        const hpf2 = ac2.createBiquadFilter();
                        hpf2.type = "highpass"; hpf2.frequency.value = 1000;
                        const gCrk = ac2.createGain();
                        gCrk.gain.value = 0.12 + Math.random() * 0.1;
                        sCrk.connect(hpf2); hpf2.connect(gCrk); gCrk.connect(ac2.destination);
                        sCrk.start(t);
                    }, i * (60 + Math.random() * 80));
                }
            } catch(e) {}
        }, 150 + Math.random() * 100);

    } catch (e) {}
}

// Kích hoạt audio sau interaction
let audioStarted = false;
function startAudio() {
    if (audioStarted) return;
    audioStarted = true;
    document.removeEventListener("click",     startAudio);
    document.removeEventListener("keydown",   startAudio);
    document.removeEventListener("touchstart", startAudio);
}
document.addEventListener("click",     startAudio);
document.addEventListener("keydown",   startAudio);
document.addEventListener("touchstart", startAudio);

// Thử auto-start
setTimeout(() => { if (!audioStarted) { audioStarted = true; } }, 500);

})();
