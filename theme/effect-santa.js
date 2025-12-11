// -----------------------------
//  SANTA + REINDEER ANIMATION
// -----------------------------

(function () {

    // Tầng hiệu ứng
    const layer = document.createElement("div");
    layer.id = "theme-effect-santa";
    layer.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        overflow: visible;
        pointer-events: none;
        z-index: 999999;
    `;
    document.body.appendChild(layer);

    // SVG Santa và Tuần lộc — icon vector
    const santaSVG = `
        <svg width="70" viewBox="0 0 64 64">
            <circle cx="32" cy="20" r="12" fill="#fff"/>
            <rect x="20" y="30" width="24" height="20" rx="4" fill="#d32f2f"/>
            <circle cx="28" cy="18" r="3" fill="#000"/>
            <circle cx="36" cy="18" r="3" fill="#000"/>
            <circle cx="32" cy="25" r="2" fill="#000"/>
            <rect x="16" y="45" width="32" height="8" rx="4" fill="#000"/>
        </svg>
    `;

    const reindeerSVG = `
        <svg width="80" viewBox="0 0 80 40">
            <rect x="10" y="20" width="50" height="15" rx="6" fill="#8d5524"/>
            <circle cx="20" cy="15" r="8" fill="#8d5524"/>
            <circle cx="18" cy="13" r="2" fill="#000"/>
            <rect x="55" y="10" width="8" height="18" fill="#8d5524"/>
            <circle cx="60" cy="8" r="4" fill="#8d5524"/>
        </svg>
    `;

    // Tạo entity chạy ngang màn hình
    function createRunner(svg, speed = 2.2, startY = 80 + Math.random() * 200) {
        const wrap = document.createElement("div");
        wrap.className = "santa-runner";
        wrap.style.cssText = `
            position: absolute;
            top: ${startY}px;
            left: -120px;
            transform: scale(1);
            transition: transform .3s;
        `;
        wrap.innerHTML = svg;
        layer.appendChild(wrap);

        let x = -120;
        let vx = speed + Math.random() * 1.5;
        let vy = 0;
        let falling = false;

        function animate() {
            const maxX = window.innerWidth + 150;

            if (!falling) {
                x += vx;

                // gặp mép phải → bật lại + té
                if (x > maxX - 120) {
                    falling = true;
                    vy = 2;
                    vx = 0;

                    wrap.style.transform = "rotate(45deg)";
                }
            } else {
                // rơi xuống đáy
                wrap.style.transform = "rotate(90deg)";
                vy += 0.25;
                wrap.style.top = (parseFloat(wrap.style.top) + vy) + "px";

                // chạm đáy → chạy tiếp
                if (parseFloat(wrap.style.top) > window.innerHeight - 100) {
                    falling = false;
                    vy = 0;
                    wrap.style.transform = "rotate(0deg) scaleX(-1)";

                    // chạy ngược lại
                    vx = -speed - Math.random() * 1.5;
                }
            }

            wrap.style.left = x + "px";

            requestAnimationFrame(animate);
        }

        animate();
    }

    // Tự tạo Santa + Tuần lộc
    function spawn() {
        createRunner(santaSVG, 2.6);
        setTimeout(() => createRunner(reindeerSVG, 3), 800);
    }

    // Lặp lại mỗi 10 giây
    spawn();
    setInterval(spawn, 10000);

})();
