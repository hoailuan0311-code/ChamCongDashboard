// 🌅 Tia nắng vàng trang trọng — Thành phố mang tên Bác
(function () {
  // Lớp phủ tia nắng tỏa từ góc trên bên trái, sắc vàng ánh đỏ nhẹ
  const ray = document.createElement("div");
  ray.style.position = "fixed";
  ray.style.top = 0;
  ray.style.left = 0;
  ray.style.width = "100vw";
  ray.style.height = "100vh";
  ray.style.pointerEvents = "none";
  ray.style.zIndex = 99998;
  ray.style.mixBlendMode = "screen";

  // Lớp 1: các tia nắng tỏa ra (conic-gradient) — chuyển động rất chậm, trang nghiêm
  const rayBeam = document.createElement("div");
  rayBeam.style.position = "absolute";
  rayBeam.style.top = "-50%";
  rayBeam.style.left = "-50%";
  rayBeam.style.width = "200%";
  rayBeam.style.height = "200%";
  rayBeam.style.background = `conic-gradient(
    from 0deg at 20% 20%,
    rgba(255, 215, 120, 0.16) 0deg,
    rgba(255, 215, 120, 0) 8deg,
    rgba(255, 215, 120, 0) 22deg,
    rgba(255, 200, 90, 0.14) 30deg,
    rgba(255, 200, 90, 0) 38deg,
    rgba(255, 215, 120, 0) 52deg,
    rgba(255, 215, 120, 0.16) 60deg,
    rgba(255, 215, 120, 0) 68deg,
    rgba(255, 215, 120, 0) 82deg,
    rgba(255, 200, 90, 0.14) 90deg,
    rgba(255, 200, 90, 0) 98deg,
    rgba(255, 215, 120, 0) 112deg,
    rgba(255, 215, 120, 0.16) 120deg,
    rgba(255, 215, 120, 0) 128deg,
    rgba(255, 215, 120, 0) 142deg,
    rgba(255, 200, 90, 0.14) 150deg,
    rgba(255, 200, 90, 0) 158deg,
    rgba(255, 215, 120, 0) 172deg,
    rgba(255, 215, 120, 0.16) 180deg,
    rgba(255, 215, 120, 0) 188deg,
    rgba(255, 215, 120, 0) 202deg,
    rgba(255, 200, 90, 0.14) 210deg,
    rgba(255, 200, 90, 0) 218deg,
    rgba(255, 215, 120, 0) 232deg,
    rgba(255, 215, 120, 0.16) 240deg,
    rgba(255, 215, 120, 0) 248deg,
    rgba(255, 215, 120, 0) 262deg,
    rgba(255, 200, 90, 0.14) 270deg,
    rgba(255, 200, 90, 0) 278deg,
    rgba(255, 215, 120, 0) 292deg,
    rgba(255, 215, 120, 0.16) 300deg,
    rgba(255, 215, 120, 0) 308deg,
    rgba(255, 215, 120, 0) 322deg,
    rgba(255, 200, 90, 0.14) 330deg,
    rgba(255, 200, 90, 0) 338deg,
    rgba(255, 215, 120, 0) 352deg,
    rgba(255, 215, 120, 0.16) 360deg
  )`;
  rayBeam.style.animation = "sunRotate 60s linear infinite";
  rayBeam.style.willChange = "transform";

  // Lớp 2: quầng sáng ấm áp, ánh vàng pha đỏ nhẹ — nhấn nhá sắc cờ Tổ quốc một cách tinh tế
  const glow = document.createElement("div");
  glow.style.position = "absolute";
  glow.style.inset = 0;
  glow.style.background =
    "radial-gradient(circle at 20% 20%, rgba(255, 223, 150, 0.30), rgba(237, 28, 36, 0.06) 45%, transparent 72%)";
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
  ray.id = "sunrays-layer";
})();