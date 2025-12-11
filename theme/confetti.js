// 🎉 Confetti mỏng nhẹ cho New Year
const confettiCanvas = document.createElement("canvas");
confettiCanvas.className = "theme-effect-canvas";
confettiCanvas.style.position = "fixed";
confettiCanvas.style.top = 0;
confettiCanvas.style.left = 0;
confettiCanvas.style.pointerEvents = "none";
confettiCanvas.style.zIndex = 99999;
document.body.appendChild(confettiCanvas);

const cfx = confettiCanvas.getContext("2d");
confettiCanvas.width = innerWidth;
confettiCanvas.height = innerHeight;

const confettiList = [];
function spawnConfetti() {
    for (let i = 0; i < 10; i++) {
        confettiList.push({
            x: Math.random() * innerWidth,
            y: -10,
            s: 5 + Math.random() * 8,
            a: Math.random() * Math.PI,
            speed: 1 + Math.random() * 2,
            color: `hsl(${Math.random()*360},100%,70%)`
        });
    }
}
setInterval(spawnConfetti, 300);

function drawConfetti() {
    cfx.clearRect(0,0,innerWidth,innerHeight);
    confettiList.forEach((p,i)=>{
        p.y += p.speed;
        p.x += Math.sin(p.a)*1.5;
        p.a += 0.05;
        if (p.y > innerHeight) confettiList.splice(i,1);

        cfx.fillStyle = p.color;
        cfx.fillRect(p.x,p.y,p.s,p.s);
    });
    requestAnimationFrame(drawConfetti);
}
drawConfetti();
