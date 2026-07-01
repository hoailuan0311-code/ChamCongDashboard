// 🌅 Tia nắng vàng trang trọng — Thành phố mang tên Bác
(function () {
  const ray = document.createElement("div");
  ray.id = "sunrays-layer";
  ray.style.position = "fixed";
  ray.style.top = "0";
  ray.style.left = "0";
  ray.style.width = "100vw";
  ray.style.height = "100vh";
  ray.style.pointerEvents = "none";
  ray.style.zIndex = "999999"; // đẩy cao hẳn để chắc chắn không bị đè
  ray.style.overflow = "hidden";
  // Không dùng mix-blend-mode nữa — hiển thị trực tiếp, chắc chắn thấy được

  // Lớp 1: các tia sáng trắng-vàng tỏa từ góc trên trái, rõ nét
  const rayBeam = document.createElement("div");
  rayBeam.style.position = "absolute";
  rayBeam.style.top = "-60%";
  rayBeam.style.left = "-60%";
  rayBeam.style.width = "220%";
  rayBeam.style.height = "220%";
  rayBeam.style.background = `conic-gradient(
    from 0deg at 25% 20%,
    rgba(255, 250, 220, 0.5) 0deg,
    rgba(255, 250, 220, 0) 6deg,
    rgba(255, 250, 220, 0) 24deg,
    rgba(255, 225, 150, 0.42) 30deg,
    rgba(255, 225, 150, 0) 36deg,
    rgba(255, 250, 220, 0) 54deg,
    rgba(255, 250, 220, 0.5) 60deg,
    rgba(255, 250, 220, 0) 66deg,
    rgba(255, 250, 220, 0) 84deg,
    rgba(255, 225, 150, 0.42) 90deg,
    rgba(255, 225, 150, 0) 96deg,
    rgba(255, 250, 220, 0) 114deg,
    rgba(255, 250, 220, 0.5) 120deg,
    rgba(255, 250, 220, 0) 126deg,
    rgba(255, 250, 220, 0) 144deg,
    rgba(255, 225, 150, 0.42) 150deg,
    rgba(255, 225, 150, 0) 156deg,
    rgba(255, 250, 220, 0) 174deg,
    rgba(255, 250, 220, 0.5) 180deg,
    rgba(255, 250, 220, 0) 186deg,
    rgba(255, 250, 220, 0) 204deg,
    rgba(255, 225, 150, 0.42) 210deg,
    rgba(255, 225, 150, 0) 216deg,
    rgba(255, 250, 220, 0) 234deg,
    rgba(255, 250, 220, 0.5) 240deg,
    rgba(255, 250, 220, 0) 246deg,
    rgba(255, 250, 220, 0) 264deg,
    rgba(255, 225, 150, 0.42) 270deg,
    rgba(255, 225, 150, 0) 276deg,
    rgba(255, 250, 220, 0) 294deg,
    rgba(255, 250, 220, 0.5) 300deg,
    rgba(255, 250, 220, 0) 306deg,
    rgba(255, 250, 220, 0) 324deg,
    rgba(255, 225, 150, 0.42) 330deg,
    rgba(255, 225, 150, 0) 336deg,
    rgba(255, 250, 220, 0) 354deg,
    rgba(255, 250, 220, 0.5) 360deg
  )`;
  rayBeam.style.animation = "sunRotate 60s linear infinite";
  rayBeam.style.willChange = "transform";

  // Lớp 2: quầng sáng ấm nổi bật ở góc — điểm nhấn "mặt trời"
  const glow = document.createElement("div");
  glow.style.position = "absolute";
  glow.style.top = "-10%";
  glow.style.left = "-10%";
  glow.style.width = "60%";
  glow.style.height = "60%";
  glow.style.background =
    "radial-gradient(circle, rgba(255,255,240,0.65) 0%, rgba(255,210,130,0.30) 35%, rgba(237,28,36,0.08) 55%, transparent 75%)";
  glow.style.animation = "sunGlow 6s ease-in-out infinite alternate";

  ray.appendChild(rayBeam);
  ray.appendChild(glow);
  document.body.appendChild(ray);

  const sunCSS = document.createElement("style");
  sunCSS.innerHTML = `
@keyframes sunRotate {
    0%   { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
@keyframes sunGlow {
    0%   { opacity: 0.75; transform: scale(1); }
    100% { opacity: 1; transform: scale(1.08); }
}
@media (prefers-reduced-motion: reduce) {
    #sunrays-layer * { animation: none !important; }
}`;
  document.head.appendChild(sunCSS);

  console.log("✔ sunrays.js: hiệu ứng đã gắn vào #sunrays-layer");
})();