// =================== 02/09 – Quốc Khánh ===================

// ----- 1) ĐỘI HÌNH TRỰC THĂNG & TIÊM KÍCH -----
const helicopters = ["🚁","🚁","🚁","🚁"];
const jets = ["✈️","🛫","🛩️"];

function createFlight(list, height, speed = 16) {
    const group = document.createElement("div");
    group.style.position = "fixed";
    group.style.left = "-200px";
    group.style.top = height;
    group.style.fontSize = "48px";
    group.style.whiteSpace = "nowrap";
    group.style.pointerEvents = "none";
    group.style.animation = `flyAcross ${speed}s linear`;
    group.style.zIndex = "99998";

    group.innerHTML = list.join("   ");   // giãn cách

    document.body.appendChild(group);
    setTimeout(() => group.remove(), speed * 1000);
}

setInterval(() => {
    createFlight(helicopters, "22vh", 20);
    setTimeout(() => createFlight(jets, "10vh", 17), 3000);
}, 26000);


// ----- 2) QUỐC KỲ VIỆT NAM -----
const flag2 = document.createElement("div");
flag2.innerHTML = "🇻🇳";
flag2.style.position = "fixed";
flag2.style.top = "5vh";
flag2.style.right = "3vw";
flag2.style.fontSize = "70px";
flag2.style.animation = "flagWaveVN 2.5s ease-in-out infinite";
flag2.style.zIndex = "99999";
flag2.style.pointerEvents = "none";
document.body.appendChild(flag2);


// ----- CSS -----
const style = document.createElement("style");
style.innerHTML = `
@keyframes flyAcross {
    0% { transform: translateX(0); }
    100% { transform: translateX(120vw); }
}

@keyframes flagWaveVN {
    0% { transform: rotate(-2deg) translateY(0px); }
    50% { transform: rotate(2deg) translateY(5px); }
    100% { transform: rotate(-2deg) translateY(0px); }
}
`;
document.head.appendChild(style);
