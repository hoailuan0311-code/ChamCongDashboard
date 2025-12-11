// =================== 30/4 – Giải phóng Miền Nam ===================

// ----- 1) XE TĂNG 843 & 390 -----
function createTank(icon) {
    const tank = document.createElement("div");
    tank.innerHTML = icon;
    tank.style.position = "fixed";
    tank.style.bottom = "6vh";
    tank.style.left = "-200px";
    tank.style.fontSize = "54px";
    tank.style.zIndex = "99998";
    tank.style.pointerEvents = "none";
    tank.style.animation = "tankRun 12s linear";

    document.body.appendChild(tank);
    setTimeout(() => tank.remove(), 12000);
}

setInterval(() => {
    createTank("🛞🛞🛞🛞🛞 🟥🟥🟥");     // mô phỏng tank 843
    setTimeout(() => createTank("🛞🛞🛞🛞🛞 🟦🟥⭐"), 2500); // tank 390
}, 20000);


// ----- 2) CỜ MẶT TRẬN GIẢI PHÓNG MIỀN NAM -----
const flag = document.createElement("div");
flag.innerHTML = "🟦🟥⭐";   // mô phỏng: xanh – đỏ – sao
flag.style.position = "fixed";
flag.style.top = "5vh";
flag.style.right = "3vw";
flag.style.fontSize = "60px";
flag.style.animation = "flagWave 2.5s ease-in-out infinite";
flag.style.zIndex = "99999";
flag.style.pointerEvents = "none";
document.body.appendChild(flag);


// ----- CSS-animation -----
const style = document.createElement("style");
style.innerHTML = `
@keyframes tankRun {
    0% { transform: translateX(0); }
    100% { transform: translateX(120vw); }
}

@keyframes flagWave {
    0% { transform: rotate(-3deg) translateY(0px); }
    50% { transform: rotate(3deg) translateY(6px); }
    100% { transform: rotate(-3deg) translateY(0px); }
}
`;
document.head.appendChild(style);
