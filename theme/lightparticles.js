// =================== August Sun – Light Particles Effect ===================

(function () {

// ─── CSS ─────────────────────────────────────────────────────────────────────
const style = document.createElement("style");
style.innerHTML = `
@keyframes floatUp {
    0%   { transform: translateY(0) scale(1) rotate(0deg); opacity: 0; }
    10%  { opacity: 1; }
    80%  { opacity: 0.7; }
    100% { transform: translateY(-100vh) scale(0.4) rotate(var(--rot)); opacity: 0; }
}
@keyframes sunPulse {
    0%,100% { transform: translate(-50%,-50%) scale(1);   opacity: 0.13; }
    50%      { transform: translate(-50%,-50%) scale(1.08); opacity: 0.2; }
}
@keyframes leafSway {
    0%   { transform: translateY(0) translateX(0) rotate(0deg); opacity:0; }
    10%  { opacity: 0.75; }
    50%  { transform: translateY(-45vh) translateX(18px) rotate(60deg); }
    90%  { opacity: 0.4; }
    100% { transform: translateY(-95vh) translateX(-10px) rotate(130deg); opacity:0; }
}
@keyframes shimmer {
    0%,100% { opacity: 0; transform: scale(0.5); }
    50%      { opacity: 1; transform: scale(1); }
}
`;
document.head.appendChild(style);

// ─── SUN GLOW BG ─────────────────────────────────────────────────────────────
const sun = document.createElement("div");
Object.assign(sun.style, {
    position: "fixed", top: "20%", left: "50%",
    width: "clamp(200px,35vw,500px)", height: "clamp(200px,35vw,500px)",
    borderRadius: "50%",
    background: "radial-gradient(circle,rgba(255,220,100,0.55) 0%,rgba(255,160,60,0.18) 50%,transparent 75%)",
    transform: "translate(-50%,-50%)",
    pointerEvents: "none", zIndex: "99990",
    animation: "sunPulse 4s ease-in-out infinite",
});
document.body.appendChild(sun);

// ─── CANVAS PARTICLES ────────────────────────────────────────────────────────
const cvs = document.createElement("canvas");
Object.assign(cvs.style, {
    position: "fixed", inset: "0", width: "100%", height: "100%",
    pointerEvents: "none", zIndex: "99991", background: "transparent",
});
cvs.width  = window.innerWidth;
cvs.height = window.innerHeight;
document.body.appendChild(cvs);
const ctx = cvs.getContext("2d");
window.addEventListener("resize", () => {
    cvs.width  = window.innerWidth;
    cvs.height = window.innerHeight;
});

// Mỗi particle: hạt ánh sáng ấm (vàng/hồng/cam) nổi lên
const particles = [];
const COLORS = [
    [50, 100, 85],   // vàng
    [30,  90, 85],   // cam
    [340, 80, 80],   // hồng
    [45,  95, 90],   // vàng nhạt
    [15,  85, 80],   // cam đỏ
];

function spawnParticle() {
    const [h, s, l] = COLORS[Math.floor(Math.random() * COLORS.length)];
    particles.push({
        x: Math.random() * cvs.width,
        y: cvs.height + 10,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -(0.4 + Math.random() * 1.2),
        r:  1.5 + Math.random() * 3.5,
        hue: h, sat: s, lit: l,
        life: 1,
        decay: 0.003 + Math.random() * 0.004,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.03 + Math.random() * 0.03,
        type: Math.random() < 0.15 ? "star" : "dot",
    });
}

function drawStar(ctx, x, y, r, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
        const b = a + Math.PI / 5;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.lineTo(Math.cos(b) * (r * 0.42), Math.sin(b) * (r * 0.42));
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
}

function drawFX() {
    ctx.clearRect(0, 0, cvs.width, cvs.height);

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.wobble += p.wobbleSpeed;
        p.x += p.vx + Math.sin(p.wobble) * 0.5;
        p.y += p.vy;
        p.life -= p.decay;
        if (p.life <= 0 || p.y < -20) { particles.splice(i, 1); continue; }

        const alpha = p.life * 0.85;
        const color = `hsla(${p.hue},${p.sat}%,${p.lit}%,${alpha})`;

        if (p.type === "star") {
            drawStar(ctx, p.x, p.y, p.r * 1.6, color);
        } else {
            // Glow halo
            const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
            grd.addColorStop(0, `hsla(${p.hue},${p.sat}%,${p.lit}%,${alpha * 0.5})`);
            grd.addColorStop(1, `hsla(${p.hue},${p.sat}%,${p.lit}%,0)`);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
            ctx.fillStyle = grd;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
        }
    }

    if (Math.random() < 0.35) spawnParticle();
    requestAnimationFrame(drawFX);
}
drawFX();

// ─── WEB AUDIO: WIND CHIME ────────────────────────────────────────────────────
let audioCtx = null;
function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

// Các nốt pentatonic ấm (C maj pentatonic)
const CHIME_NOTES = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66];

function playChime() {
    try {
        const ac = getAudioCtx();
        const note = CHIME_NOTES[Math.floor(Math.random() * CHIME_NOTES.length)];
        const duration = 2.2 + Math.random() * 1.5;
        const now = ac.currentTime;

        // Oscillator chính
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(note, now);
        osc.frequency.exponentialRampToValueAtTime(note * 0.995, now + duration);

        // Overtone (harmonic)
        const osc2 = ac.createOscillator();
        const gain2 = ac.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(note * 2.756, now); // inharmonic partial → bell-like
        gain2.gain.setValueAtTime(0.08, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.4);

        // Reverb đơn giản qua delay
        const delay = ac.createDelay(0.5);
        delay.delayTime.value = 0.25;
        const feedbackGain = ac.createGain();
        feedbackGain.gain.value = 0.2;
        delay.connect(feedbackGain);
        feedbackGain.connect(delay);

        const masterGain = ac.createGain();
        masterGain.gain.value = 0.18;

        osc.connect(gain);
        osc2.connect(gain2);
        gain.connect(delay);
        gain.connect(masterGain);
        gain2.connect(masterGain);
        delay.connect(masterGain);
        masterGain.connect(ac.destination);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.7, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.start(now); osc.stop(now + duration + 0.1);
        osc2.start(now); osc2.stop(now + duration * 0.5);
    } catch (e) {}
}

// Chime ngẫu nhiên mỗi 2–5 giây
function scheduleChime() {
    const wait = 2000 + Math.random() * 3000;
    setTimeout(() => { playChime(); scheduleChime(); }, wait);
}

// Kích hoạt audio sau interaction đầu tiên (browser policy)
let chimeStarted = false;
function startChimeOnInteraction() {
    if (chimeStarted) return;
    chimeStarted = true;
    scheduleChime();
    document.removeEventListener("click",    startChimeOnInteraction);
    document.removeEventListener("keydown",  startChimeOnInteraction);
    document.removeEventListener("touchstart", startChimeOnInteraction);
}
document.addEventListener("click",     startChimeOnInteraction);
document.addEventListener("keydown",   startChimeOnInteraction);
document.addEventListener("touchstart", startChimeOnInteraction);

// Thử auto-start (works nếu page đã có interaction trước đó)
setTimeout(() => { if (!chimeStarted) { playChime(); chimeStarted = true; scheduleChime(); } }, 800);

})();
