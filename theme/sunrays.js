// 🌅 Tia nắng vàng trang trọng — Thành phố mang tên Bác
(function () {
  const ray = document.createElement("div");
  ray.id = "sunrays-layer";
  ray.style.position = "fixed";
  ray.style.top = 0;
  ray.style.left = 0;
  ray.style.width = "100vw";
  ray.style.height = "100vh";
  ray.style.pointerEvents = "none";
  ray.style.zIndex = 99998;
  // Bỏ mix-blend-mode "screen" (quá mờ trên nền sáng) → dùng "soft-light" để vẫn hòa nền nhưng vẫn thấy rõ tia
  ray.style.mixBlendMode = "soft-light";

  // Lớp 1: tia nắng tỏa ra — tăng độ đậm để nhìn thấy rõ trên nền vàng/cam
  const rayBeam = document.createElement("div");
  rayBeam.style.position = "absolute";
  rayBeam.style.top = "-50%";
  rayBeam.style.left = "-50%";
  rayBeam.style.width = "200%";
  rayBeam.style.height = "200%";
  rayBeam.style.background = `conic-gradient(
    from 0deg at 20% 20%,
    rgba(255, 255, 255, 0.55) 0deg,
    rgba(255, 255, 255, 0) 8deg,
    rgba(255, 255, 255, 0) 22deg,
    rgba(255, 240, 200, 0.45) 30deg,
    rgba(255, 240, 200, 0) 38deg,
    rgba(255, 255, 255, 0) 52deg,
    rgba(255, 255, 255, 0.55) 60deg,
    rgba(255, 255, 255, 0) 68deg,
    rgba(255, 255, 255, 0) 82deg,
    rgba(255, 240, 200, 0.45) 90deg,
    rgba(255, 240, 200, 0) 98deg,
    rgba(255, 255, 255, 0) 112deg,
    rgba(255, 255, 255, 0.55) 120deg,
    rgba(255, 255, 255, 0) 128deg,
    rgba(255, 255, 255, 0) 142deg,
    rgba(255, 240, 200, 0.45) 150deg,
    rgba(255, 240, 200, 0) 158deg,
    rgba(255, 255, 255, 0) 172deg,
    rgba(255, 255, 255, 0.55) 180deg,
    rgba(255, 255, 255, 0) 188deg,
    rgba(255, 255, 255, 0) 202deg,
    rgba(255, 240, 200, 0.45) 210deg,
    rgba(255, 240, 200, 0) 218deg,
    rgba(255, 255, 255, 0) 232deg,
    rgba(255, 255, 255, 0.55) 240deg,
    rgba(255, 255, 255, 0) 248deg,
    rgba(255, 255, 255, 0) 262deg,
    rgba(255, 240, 200, 0.45) 270deg,
    rgba(255, 240, 200, 0) 278deg,
    rgba(255, 255, 255, 0) 292deg,
    rgba(255, 255, 255, 0.55) 300deg,
    rgba(255, 255, 255, 0) 308deg,
    rgba(255, 255, 255, 0) 322deg,
    rgba(255, 240, 200, 0.45) 330deg,
    rgba(255, 240, 200, 0) 338deg,
    rgba(255, 255, 255, 0) 352deg,
    rgba(255, 255, 255, 0.55) 360deg
  )`;
  rayBeam.style.animation = "sunRotate 60s linear infinite";
  rayBeam.style.willChange = "transform";

  // Lớp 2: quầng sáng ấm — đậm hơn bản trước để nổi bật trên nền cam/đỏ
  const glow = document.createElement("div");
  glow.style.position = "absolute";
  glow.style.inset = 0;
  glow.style.background =
    "radial-gradient(circle at 20% 20%, rgba(255,255,230,0.55), rgba(255,120,80,0.10) 45%, transparent 72%)";
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
    0%   { opacity: 0.75; }
    100% { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
    #sunrays-layer * { animation: none !important; }
}`;
  document.head.appendChild(sunCSS);

  console.log("✔ sunrays.js: hiệu ứng đã gắn vào #sunrays-layer");
})();