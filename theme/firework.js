// 🎆 Hiệu ứng pháo hoa
const canvas = document.createElement("canvas");
canvas.style.position = "fixed";
canvas.style.top = "0";
canvas.style.left = "0";
canvas.style.pointerEvents = "none";
canvas.style.zIndex = 9998;
document.body.appendChild(canvas);

const ctx = canvas.getContext("2d");
canvas.width = innerWidth;
canvas.height = innerHeight;

window.addEventListener("resize", () => {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
});

function randomColor() {
    return `hsl(${Math.random() * 360},100%,60%)`;
}

function firework() {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height * 0.5;
    const particles = [];

    for (let i = 0; i < 40; i++) {
        particles.push({
            x,
            y,
            angle: Math.random() * Math.PI * 2,
            speed: 2 + Math.random() * 4,
            radius: 2 + Math.random() * 2,
            color: randomColor()
        });
    }

    let frame = 0;
    function animate() {
        frame++;
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => {
            p.x += Math.cos(p.angle) * p.speed;
            p.y += Math.sin(p.angle) * p.speed;
            p.speed *= 0.98;

            ctx.beginPath();
            ctx.fillStyle = p.color;
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        if (frame < 60) requestAnimationFrame(animate);
    }
    animate();
}

setInterval(firework, 800);
