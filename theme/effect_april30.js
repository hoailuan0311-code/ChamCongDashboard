// =================== 30/4 – Giải Phóng Miền Nam ===================

(function () {

// ─── 1. CSS ──────────────────────────────────────────────────────
const style = document.createElement("style");
style.innerHTML = `
@keyframes tankRoll30 {
    0%   { left: -230px; opacity: 0; }
    5%   { opacity: 1; }
    95%  { opacity: 1; }
    100% { left: calc(100vw + 230px); opacity: 0; }
}
@keyframes wheelSpin30 {
    to { transform: rotate(360deg); }
}
@keyframes flagWave30 {
    0%   { transform: skewY(0deg) scaleX(1); }
    25%  { transform: skewY(2deg) scaleX(0.97); }
    50%  { transform: skewY(-1deg) scaleX(1.02); }
    75%  { transform: skewY(1.5deg) scaleX(0.98); }
    100% { transform: skewY(0deg) scaleX(1); }
}
@keyframes bannerIn30 {
    0%   { opacity: 0; transform: translateX(-50%) scale(0.85) translateY(-15px); }
    60%  { opacity: 1; transform: translateX(-50%) scale(1) translateY(0); }
    85%  { opacity: 1; }
    100% { opacity: 0; }
}
@keyframes exhaust30 {
    0%   { opacity: 0.5; transform: translateY(0) scale(1); }
    100% { opacity: 0;   transform: translateY(-20px) scale(2.2); }
}
.wheel30 {
    animation: wheelSpin30 0.55s linear infinite;
    transform-origin: center;
    transform-box: fill-box;
}
`;
document.head.appendChild(style);

// ─── 2. BANNER (tự ẩn sau 7s, không block click) ─────────────────
const banner = document.createElement("div");
Object.assign(banner.style, {
    position: "fixed", top: "8%", left: "50%",
    transform: "translateX(-50%)",
    textAlign: "center", pointerEvents: "none",   // ← không chặn click
    zIndex: "99999", fontFamily: "Georgia, serif",
    opacity: "0",
    animation: "bannerIn30 7s ease forwards 0.6s",
});
banner.innerHTML = `
    <div style="font-size:clamp(38px,7vw,82px);font-weight:900;color:#ffd700;
        letter-spacing:5px;line-height:1;
        text-shadow:0 0 35px rgba(255,215,0,0.55),0 4px 18px rgba(0,0,0,0.8)">
        30/4
    </div>
    <div style="font-size:clamp(13px,2.2vw,20px);color:#ff8c00;
        letter-spacing:7px;text-transform:uppercase;margin-top:7px;
        text-shadow:0 2px 10px rgba(0,0,0,0.8)">
        Giải Phóng Miền Nam
    </div>
    <div style="font-size:clamp(11px,1.5vw,16px);color:rgba(255,220,90,0.75);
        letter-spacing:3px;margin-top:4px">
        1975 — Ngày Thống Nhất Non Sông
    </div>`;
document.body.appendChild(banner);
setTimeout(() => banner.remove(), 9000);

// ─── 3. CỜ ───────────────────────────────────────────────────────
const STAR = "1.5,0.28 1.655,0.77 2.17,0.77 1.758,1.055 1.91,1.545 1.5,1.26 1.09,1.545 1.242,1.055 0.83,0.77 1.345,0.77";

function createFlag(svgContent, rightOffset, waveDelay) {
    const pole = document.createElement("div");
    Object.assign(pole.style, {
        position: "fixed", top: "5%", right: rightOffset,
        width: "3px", height: "clamp(55px,8vw,95px)",
        background: "linear-gradient(to bottom,#d4a860,#a07840)",
        borderRadius: "2px", zIndex: "99997", pointerEvents: "none",
    });
    document.body.appendChild(pole);

    const flag = document.createElement("div");
    Object.assign(flag.style, {
        position: "fixed", top: "5%", right: rightOffset,
        width: "clamp(58px,7.5vw,96px)", height: "clamp(38px,5vw,64px)",
        transformOrigin: "left center", zIndex: "99998", pointerEvents: "none",
        animation: `flagWave30 2.2s ease-in-out ${waveDelay}s infinite`,
        filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.45))",
    });
    flag.innerHTML = svgContent;
    document.body.appendChild(flag);
    return [pole, flag];
}

const vnFlag = `<svg viewBox="0 0 3 2" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
    <rect width="3" height="2" fill="#da251d"/>
    <polygon fill="#ffff00" points="${STAR}"/>
</svg>`;
const nlfFlag = `<svg viewBox="0 0 3 2" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
    <rect width="3" height="1" fill="#0059a7"/>
    <rect y="1" width="3" height="1" fill="#da251d"/>
    <polygon fill="#ffff00" points="${STAR}"/>
</svg>`;

const [p1, f1] = createFlag(vnFlag,  "3vw", 0);
const [p2, f2] = createFlag(nlfFlag, "calc(3vw + clamp(65px,8.5vw,108px))", 0.5);
setTimeout(() => [p1,f1,p2,f2].forEach(e => e.remove()), 40000);

// ─── 4. TANK ─────────────────────────────────────────────────────
function buildTankSVG(bodyColor, darkColor, label) {
    const wheels = [32, 72, 112, 158].map((cx, i) => {
        const r = i === 0 || i === 3 ? 12 : 10;
        return `<g class="wheel30">
            <circle cx="${cx}" cy="69" r="${r}" fill="${darkColor}" stroke="#111" stroke-width="1.8"/>
            <line x1="${cx}" y1="${69-r}" x2="${cx}" y2="${69+r}" stroke="#556" stroke-width="1.3"/>
            <line x1="${cx-r}" y1="69" x2="${cx+r}" y2="69" stroke="#556" stroke-width="1.3"/>
            <circle cx="${cx}" cy="69" r="${r*0.3}" fill="#667"/>
        </g>`;
    }).join('');
    return `<svg width="210" height="86" viewBox="0 0 210 86" xmlns="http://www.w3.org/2000/svg">
        <rect x="15" y="28" width="165" height="36" rx="5" fill="${bodyColor}"/>
        <rect x="50" y="13" width="80" height="23" rx="4" fill="${darkColor}"/>
        <rect x="76" y="5"  width="85" height="10" rx="3" fill="${darkColor}"/>
        <rect x="10" y="61" width="178" height="9"  rx="3" fill="#1e1e1e"/>
        ${wheels}
        <text x="97" y="56" text-anchor="middle" font-size="10.5" fill="rgba(255,255,200,0.88)"
              font-family="monospace" font-weight="bold">${label}</text>
    </svg>`;
}

function spawnTank(label, bodyColor, darkColor, delay, duration) {
    const wrap = document.createElement("div");
    Object.assign(wrap.style, {
        position: "fixed", bottom: "4.5vh", pointerEvents: "none",
        zIndex: "99996",
        animation: `tankRoll30 ${duration}s linear ${delay}s`,
    });
    wrap.innerHTML = buildTankSVG(bodyColor, darkColor, label);
    const smoke = document.createElement("div");
    Object.assign(smoke.style, {
        position: "absolute", top: "2px", left: "76px",
        width: "14px", height: "14px", borderRadius: "50%",
        background: "rgba(200,200,185,0.4)",
        animation: "exhaust30 0.9s ease-out infinite",
    });
    wrap.appendChild(smoke);
    document.body.appendChild(wrap);
    setTimeout(() => wrap.remove(), (delay + duration + 1) * 1000);
}

spawnTank("843", "#5c7a3c", "#4a6230", 1, 16);
setTimeout(() => spawnTank("390", "#4e6e38", "#3c5828", 3.5, 15), 0);
setTimeout(() => {
    spawnTank("843", "#5c7a3c", "#4a6230", 1, 16);
    setTimeout(() => spawnTank("390", "#4e6e38", "#3c5828", 3.5, 15), 0);
}, 22000);

// ─── 5. PHÁO HOA — canvas TRONG SUỐT ────────────────────────────
const cvs = document.createElement("canvas");
Object.assign(cvs.style, {
    position: "fixed", inset: "0",
    width: "100%", height: "100%",
    pointerEvents: "none",          // ← không chặn click/scroll
    zIndex: "99995",
    background: "transparent",     // ← hoàn toàn trong suốt
});
cvs.width  = window.innerWidth;
cvs.height = window.innerHeight;
document.body.appendChild(cvs);
const fx = cvs.getContext("2d");

window.addEventListener("resize", () => {
    cvs.width = window.innerWidth;
    cvs.height = window.innerHeight;
});

// Mỗi particle tự lưu trail
const parts = [];

function burst(x, y) {
    const palettes = [
        [45, 55],    // vàng kim
        [15, 30],    // cam đỏ
        [50, 65],    // vàng xanh
        [195, 215],  // xanh lam
        [270, 290],  // tím
    ];
    const [h1, h2] = palettes[Math.floor(Math.random() * palettes.length)];
    const n = 55 + Math.floor(Math.random() * 35);
    for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 / n) * i + (Math.random() - 0.5) * 0.3;
        const s = 2.5 + Math.random() * 4.5;
        parts.push({
            x, y,
            vx: Math.cos(a) * s,
            vy: Math.sin(a) * s,
            life: 1,
            decay: 0.013 + Math.random() * 0.013,
            r: 1 + Math.random() * 2,
            hue: h1 + Math.random() * (h2 - h1),
            trail: [],   // lưu vị trí cũ để vẽ đuôi
        });
    }
}

function drawFX() {
    // clearRect thay vì fill đen → nền web hiện ra bình thường
    fx.clearRect(0, 0, cvs.width, cvs.height);

    for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];

        // Lưu trail (tối đa 7 điểm)
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 7) p.trail.shift();

        p.x  += p.vx;
        p.y  += p.vy;
        p.vy += 0.07;
        p.vx *= 0.986;
        p.life -= p.decay;

        if (p.life <= 0) { parts.splice(i, 1); continue; }

        // Vẽ trail mờ dần
        for (let j = 0; j < p.trail.length; j++) {
            const t = p.trail[j];
            const ratio = j / p.trail.length;
            fx.beginPath();
            fx.arc(t.x, t.y, p.r * ratio * 0.65, 0, Math.PI * 2);
            fx.fillStyle = `hsla(${p.hue},100%,72%,${ratio * p.life * 0.45})`;
            fx.fill();
        }

        // Vẽ hạt chính
        fx.beginPath();
        fx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        fx.fillStyle = `hsla(${p.hue},100%,88%,${p.life})`;
        fx.fill();
    }

    requestAnimationFrame(drawFX);
}
drawFX();

const randX = () => cvs.width  * (0.12 + Math.random() * 0.76);
const randY = () => cvs.height * (0.06 + Math.random() * 0.45);

// Bắn loạt đầu
burst(randX(), randY());
setTimeout(() => burst(randX(), randY()), 350);
setTimeout(() => burst(randX(), randY()), 700);

const fwInterval = setInterval(() => {
    burst(randX(), randY());
    setTimeout(() => burst(randX(), randY()), 300);
}, 1200);

// Dọn dẹp sau 40 giây
setTimeout(() => {
    clearInterval(fwInterval);
    cvs.remove();
}, 40000);

})();