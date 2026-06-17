/* =====================================================================
   ecoSaving.js  –  "Tác động Xanh từ Chuyển đổi số"
   Đọc dataLMreport.js (L = Leave, M = Missing), tính giấy/oxy/CO2/nước
   tiết kiệm được, render 1 thẻ động chèn lên đầu Báo cáo Nghỉ phép.

   Nguồn hệ số:
     - CO2  ~4.7 g/tờ A4 80gsm (cradle-to-customer, Gonçalves et al. 2011)
     - Nước  7 L/tờ A4 80gsm (van Oel & Hoekstra 2010, waterfootprint.org)
     - Oxy = CO2 giảm × 0.727 (tỉ lệ khối lượng O2/CO2 trong quang hợp)
     - 1 cây ≈ 8.333 tờ A4

   Tất cả thông số chỉnh ở khối ECO bên dưới.
   ===================================================================== */
(function () {
  "use strict";

  /* ---------- CẤU HÌNH (chỉnh thoải mái) ---------- */
  var ECO = {
    DATA_URL: "dataLMreport.js",   // file tổng hợp Leave + Missing
    M_PER_SHEET: 4,                // 4 dòng M = 1 tờ A4
    CO2_PER_SHEET_G: 4.7,          // g CO2 / tờ
    O2_RATIO: 0.727,              // O2 = CO2 × 0.727
    WATER_PER_SHEET_L: 5,          // L nước / tờ  (đổi 5 nếu muốn khiêm tốn)
    SHEETS_PER_TREE: 8333,         // tờ / 1 cây
    BOTTLE_L: 0.5,                 // chai nước 500ml
    KM_PER_KG_CO2: 10,             // ~0.1 kg CO2/km xe máy -> 10 km/kg
    MILESTONES: [
      { need: 10,   emoji: "🌱",   name: "Khởi đầu xanh" },
      { need: 50,   emoji: "🌿",   name: "Mầm vươn" },
      { need: 100,  emoji: "🍃",   name: "Tán lá đầu" },
      { need: 500,  emoji: "🌲",   name: "Cây non" },
      { need: 1000, emoji: "🌳",   name: "Cây trưởng thành" },
      { need: 1500, emoji: "🌲🌳",  name: "Vườn nhỏ" },
      { need: 2000, emoji: "🌳🌳", name: "Rừng nhỏ" }
    ]
  };

  /* ---------- Helpers ---------- */
  function vn(n) { return Math.round(n).toLocaleString("vi-VN"); }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  /* ---------- Inject CSS một lần ---------- */
  function injectCSS() {
    if (document.getElementById("ecoSavingCSS")) return;
    var s = document.createElement("style");
    s.id = "ecoSavingCSS";
    s.textContent =
      "@keyframes ecoSweep{0%{left:-40%}60%,100%{left:120%}}" +
      "@keyframes ecoAura{0%,100%{box-shadow:0 0 22px rgba(45,212,160,.16),inset 0 0 28px rgba(45,212,160,.05)}50%{box-shadow:0 0 40px rgba(45,212,160,.34),inset 0 0 40px rgba(45,212,160,.09)}}" +
      "@keyframes ecoRay{from{transform:rotate(0)}to{transform:rotate(360deg)}}" +
      "@keyframes ecoPop{0%{transform:scale(1)}40%{transform:scale(1.18)}100%{transform:scale(1)}}" +
      "@keyframes ecoSpark{0%{transform:scale(0) rotate(0);opacity:0}40%{opacity:1}100%{transform:scale(1.4) rotate(90deg);opacity:0}}" +
      "@keyframes ecoConf{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(420px) rotate(720deg);opacity:0}}" +
      "#ecoCard{background:#0e121b;border:1px solid #1f6f54;border-radius:16px;padding:20px 22px;margin:14px 0 18px;font-family:'Be Vietnam Pro',sans-serif;overflow:hidden;position:relative;animation:ecoAura 4s ease-in-out infinite}" +
      "#ecoCard .eco-kpi{background:#16202b;border:1px solid #243345;border-radius:12px;padding:10px 12px}" +
      "#ecoCard .eco-kpi .lab{font-size:11px;color:#8aa}" +
      "#ecoCard .eco-kpi .val{font-size:24px;font-weight:800}" +
      "#ecoCard .ecoBadge{flex:1;min-width:84px;text-align:center;background:#16202b;border:1px solid #243345;border-radius:11px;padding:8px 4px;transition:all .5s ease;filter:grayscale(1);opacity:.32}" +
      "#ecoCard .ecoBadge.on{filter:none;opacity:1;border-color:#2dd4a0;background:rgba(45,212,160,.12)}" +
      "#ecoCard .ecoBadge .bem{font-size:20px}" +
      "#ecoCard .ecoBadge .bnm{font-size:10.5px;color:#cfe;font-weight:700;line-height:1.15}" +
      "#ecoCard .ecoBadge .bnd{font-size:9.5px;color:#789}";
    document.head.appendChild(s);
  }

  /* ---------- Build HTML thẻ ---------- */
  function buildHTML(d) {
    var badges = ECO.MILESTONES.map(function (m) {
      return '<div class="ecoBadge" data-need="' + m.need + '">' +
        '<div class="bem">' + m.emoji + '</div>' +
        '<div class="bnm">' + m.name + '</div>' +
        '<div class="bnd">' + vn(m.need) + ' tờ</div></div>';
    }).join("");

    return '' +
    '<div id="ecoFx" style="position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:1"></div>' +
    '<div style="position:absolute;top:0;left:-40%;width:35%;height:100%;background:linear-gradient(100deg,transparent,rgba(122,240,196,.13),transparent);animation:ecoSweep 5s ease-in-out infinite;z-index:1;pointer-events:none"></div>' +

    '<div style="display:flex;align-items:center;gap:10px;position:relative;z-index:3">' +
      '<span style="font-size:22px;filter:drop-shadow(0 0 8px #2dd4a0)">🌱</span>' +
      '<div><div style="font-size:16px;font-weight:800;background:linear-gradient(90deg,#2dd4a0,#7af0c4,#43e97b);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent">Tác động Xanh từ Chuyển đổi số</div>' +
      '<div style="font-size:11px;color:#7c8b86;letter-spacing:.3px">Mỗi đơn online = một tờ giấy không bị in ra</div></div>' +
      '<div style="flex:1;height:2px;margin-left:8px;background:linear-gradient(90deg,#2dd4a0,transparent);box-shadow:0 0 8px #2dd4a0;border-radius:2px"></div>' +
    '</div>' +

    '<div style="display:flex;gap:18px;align-items:center;margin-top:16px;position:relative;z-index:3;flex-wrap:wrap">' +
      '<div style="position:relative;width:128px;height:128px;flex-shrink:0;display:flex;align-items:flex-end;justify-content:center">' +
        '<div style="position:absolute;top:8px;left:50%;transform:translateX(-50%);width:96px;height:96px;animation:ecoRay 22s linear infinite;opacity:.5">' +
          '<svg viewBox="0 0 96 96" width="96" height="96"><g stroke="#2dd4a0" stroke-width="2" opacity=".45">' +
          '<line x1="48" y1="0" x2="48" y2="12"/><line x1="48" y1="84" x2="48" y2="96"/><line x1="0" y1="48" x2="12" y2="48"/><line x1="84" y1="48" x2="96" y2="48"/>' +
          '<line x1="14" y1="14" x2="22" y2="22"/><line x1="74" y1="74" x2="82" y2="82"/><line x1="74" y1="14" x2="82" y2="22"/><line x1="14" y1="74" x2="22" y2="82"/></g></svg>' +
        '</div>' +
        '<svg viewBox="0 0 128 128" width="128" height="128" style="position:relative;z-index:2">' +
          '<ellipse cx="64" cy="118" rx="36" ry="6" fill="#1f6f54" opacity=".4"/>' +
          '<rect id="ecoTrunk" x="60" y="78" width="8" height="0" rx="3" fill="#5a3a22"/>' +
          '<g id="ecoCrown" style="opacity:0;transform-origin:64px 60px;transform:scale(0)">' +
            '<circle cx="64" cy="50" r="28" fill="#1d9e75"/><circle cx="46" cy="60" r="19" fill="#2dd4a0"/>' +
            '<circle cx="82" cy="60" r="19" fill="#27b889"/><circle cx="64" cy="40" r="17" fill="#43e97b"/>' +
          '</g></svg>' +
      '</div>' +

      '<div style="flex:1;min-width:236px;display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
        '<div class="eco-kpi"><div class="lab">📄 Giấy A4 tiết kiệm</div><div class="val" style="color:#e8fff6"><span class="ecoCnt" data-to="' + d.sheets + '">0</span> <span style="font-size:12px;color:#7c8b86">tờ</span></div></div>' +
        '<div class="eco-kpi"><div class="lab">🌬️ Oxy bảo toàn</div><div class="val" style="color:#7af0c4;text-shadow:0 0 12px rgba(122,240,196,.5)"><span class="ecoCnt" data-to="' + d.o2 + '">0</span> <span style="font-size:12px;color:#7c8b86">g</span></div></div>' +
        '<div class="eco-kpi"><div class="lab">☁️ CO₂ giảm thải</div><div class="val" style="color:#ffd86b;text-shadow:0 0 12px rgba(255,216,107,.4)"><span class="ecoCnt" data-to="' + d.co2 + '">0</span> <span style="font-size:12px;color:#7c8b86">g</span></div></div>' +
        '<div class="eco-kpi"><div class="lab">💧 Nước tiết kiệm</div><div class="val" style="color:#6fb7ff;text-shadow:0 0 12px rgba(111,183,255,.45)"><span class="ecoCnt" data-to="' + d.water + '">0</span> <span style="font-size:12px;color:#7c8b86">L</span></div></div>' +
      '</div>' +
    '</div>' +

    '<div style="margin-top:16px;position:relative;z-index:3">' +
      '<div style="font-size:11px;color:#7c8b86;margin-bottom:7px;letter-spacing:.3px">🏅 MỐC THÀNH TỰU</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' + badges + '</div>' +
    '</div>' +

    '<div style="margin-top:13px;position:relative;z-index:3">' +
      '<div style="display:flex;justify-content:space-between;font-size:11px;color:#7c8b86;margin-bottom:4px">' +
        '<span id="ecoNext">–</span><span id="ecoPct">0%</span></div>' +
      '<div style="height:8px;background:#16202b;border-radius:6px;overflow:hidden">' +
        '<div id="ecoBar" style="height:100%;width:0;background:linear-gradient(90deg,#1d9e75,#43e97b);box-shadow:0 0 12px #2dd4a0;border-radius:6px;transition:width 1.8s ease"></div></div>' +
    '</div>' +

    '<div id="ecoFun" style="margin-top:12px;font-size:11.5px;color:#9fb;background:rgba(45,212,160,.07);border:1px dashed #1f6f54;border-radius:10px;padding:7px 11px;position:relative;z-index:3;transition:opacity .4s">–</div>';
  }

  /* ---------- Animations ---------- */
  function animate(card, d) {
    /* count-up */
    card.querySelectorAll(".ecoCnt").forEach(function (el) {
      var to = +el.dataset.to, st = null, dur = 1600;
      function step(ts) {
        if (!st) st = ts;
        var p = Math.min((ts - st) / dur, 1);
        el.textContent = vn(easeOut(p) * to);
        if (p < 1) requestAnimationFrame(step);
        else { el.style.display = "inline-block"; el.style.animation = "ecoPop .4s ease"; }
      }
      requestAnimationFrame(step);
    });

    /* cây mọc */
    var trunk = card.querySelector("#ecoTrunk");
    if (trunk) setTimeout(function () { trunk.style.transition = "all 1s ease"; trunk.setAttribute("height", "42"); trunk.setAttribute("y", "42"); }, 120);
    var crown = card.querySelector("#ecoCrown");
    if (crown) { crown.style.transition = "all 1.1s cubic-bezier(.34,1.56,.64,1)"; setTimeout(function () { crown.style.opacity = "1"; crown.style.transform = "scale(1)"; }, 700); }

    /* badges */
    card.querySelectorAll(".ecoBadge").forEach(function (b, i) {
      if (d.sheets >= +b.dataset.need) setTimeout(function () { b.classList.add("on"); spark(b); }, 900 + i * 280);
    });

    /* thanh tiến độ tới mốc kế */
    var next = null;
    for (var k = 0; k < ECO.MILESTONES.length; k++) { if (d.sheets < ECO.MILESTONES[k].need) { next = ECO.MILESTONES[k]; break; } }
    var nextEl = card.querySelector("#ecoNext"), pctEl = card.querySelector("#ecoPct"), bar = card.querySelector("#ecoBar");
    if (next) {
      var pct = Math.min(Math.round(d.sheets / next.need * 100), 100);
      var remain = next.need - d.sheets;
      if (nextEl) nextEl.textContent = next.emoji + ' Còn ' + vn(remain) + ' tờ nữa đạt "' + next.name + '"';
      if (pctEl) pctEl.textContent = pct + "%";
      setTimeout(function () { if (bar) bar.style.width = pct + "%"; }, 400);
    } else {
      if (nextEl) nextEl.textContent = "🏆 Đã đạt toàn bộ mốc – tuyệt vời!";
      if (pctEl) pctEl.textContent = "100%";
      setTimeout(function () { if (bar) bar.style.width = "100%"; }, 400);
    }

    particles(card);
    rotateFun(card, d);
    maybeConfetti(card, d);
  }

  function spark(host) {
    host.style.position = "relative";
    for (var i = 0; i < 5; i++) (function (i) {
      var s = document.createElement("div");
      s.textContent = "✦";
      s.style.cssText = "position:absolute;top:" + (20 + Math.random() * 40) + "%;left:" + (20 + Math.random() * 60) + "%;color:#7af0c4;font-size:" + (8 + Math.random() * 8) + "px;pointer-events:none;animation:ecoSpark .9s ease forwards;animation-delay:" + (i * 80) + "ms";
      host.appendChild(s);
      setTimeout(function () { s.remove(); }, 1100 + i * 80);
    })(i);
  }

  function particles(card) {
    var layer = card.querySelector("#ecoFx");
    if (!layer) return;
    for (var i = 0; i < 7; i++) (function (i) {
      var b = document.createElement("div"), sz = 6 + Math.random() * 10;
      b.style.cssText = "position:absolute;bottom:-20px;left:" + (8 + Math.random() * 40) + "%;width:" + sz + "px;height:" + sz + "px;border-radius:50%;background:radial-gradient(circle at 30% 30%,rgba(122,240,196,.9),rgba(45,212,160,.12));box-shadow:0 0 8px rgba(45,212,160,.5)";
      layer.appendChild(b);
      b.animate([{ transform: "translateY(0)", opacity: 0 }, { opacity: .9, offset: .2 }, { transform: "translateY(-160px)", opacity: 0 }],
        { duration: 3800 + Math.random() * 2400, delay: i * 430, iterations: Infinity, easing: "ease-out" });
    })(i);
    for (var j = 0; j < 5; j++) (function (j) {
      var l = document.createElement("div");
      l.textContent = "🍃";
      l.style.cssText = "position:absolute;top:-24px;left:" + (35 + Math.random() * 60) + "%;font-size:" + (11 + Math.random() * 7) + "px;opacity:.8";
      layer.appendChild(l);
      l.animate([{ transform: "translateY(0) rotate(0)", opacity: 0 }, { opacity: .85, offset: .15 }, { transform: "translateY(200px) rotate(" + (180 + Math.random() * 180) + "deg)", opacity: 0 }],
        { duration: 6000 + Math.random() * 3000, delay: j * 900, iterations: Infinity, easing: "linear" });
    })(j);
  }

  function rotateFun(card, d) {
    var el = card.querySelector("#ecoFun");
    if (!el) return;
    var bottles = Math.round(d.water / ECO.BOTTLE_L);
    var km = Math.round(d.co2 / 1000 * ECO.KM_PER_KG_CO2 * 10) / 10;
    var treePct = Math.round(d.sheets / ECO.SHEETS_PER_TREE * 1000) / 10;
    var msgs = [
      "💡 " + vn(d.water) + " L nước ≈ <b>" + vn(bottles) + " chai</b> nước 500ml",
      "🏍️ Lượng CO₂ giảm ≈ <b>" + km + " km</b> chạy xe máy",
      "🌳 Đã góp phần cứu <b>" + treePct + "%</b> một cây xanh",
      "⚖️ Tổng giấy đã tránh in: <b>" + vn(d.sheets * 5) + " g</b> (≈ " + (Math.round(d.sheets * 5 / 100) / 10) + " kg)"
    ];
    var idx = 0;
    el.innerHTML = msgs[0];
    setInterval(function () {
      el.style.opacity = "0";
      setTimeout(function () { idx = (idx + 1) % msgs.length; el.innerHTML = msgs[idx]; el.style.opacity = "1"; }, 400);
    }, 4000);
  }

  function maybeConfetti(card, d) {
    var earnedTop = 0;
    for (var i = 0; i < ECO.MILESTONES.length; i++) if (d.sheets >= ECO.MILESTONES[i].need) earnedTop = ECO.MILESTONES[i].need;
    if (!earnedTop) return;
    var last = 0;
    try { last = +localStorage.getItem("ecoLastMs") || 0; } catch (e) { }
    if (earnedTop <= last) return;            // chưa có mốc mới -> không confetti
    try { localStorage.setItem("ecoLastMs", earnedTop); } catch (e) { }
    confetti(card);
  }

  function confetti(card) {
    var colors = ["#2dd4a0", "#7af0c4", "#43e97b", "#ffd86b", "#6fb7ff"];
    var layer = card.querySelector("#ecoFx") || card;
    for (var i = 0; i < 40; i++) (function (i) {
      var c = document.createElement("div");
      c.style.cssText = "position:absolute;top:-10px;left:" + (Math.random() * 100) + "%;width:" + (5 + Math.random() * 5) + "px;height:" + (8 + Math.random() * 6) + "px;background:" + colors[i % colors.length] + ";border-radius:2px;z-index:5;animation:ecoConf " + (1.4 + Math.random() * 1.2) + "s ease-in forwards;animation-delay:" + (Math.random() * .4) + "s";
      layer.appendChild(c);
      setTimeout(function () { c.remove(); }, 3200);
    })(i);
  }

  /* ---------- Tính toán từ data ---------- */
  function compute(rows) {
    var L = 0, M = 0;
    rows.forEach(function (r) {
      var t = (r && r.tp ? String(r.tp).trim().toUpperCase() : "");
      if (t === "L") L++; else if (t === "M") M++;
    });
    var sheets = L + Math.ceil(M / ECO.M_PER_SHEET);
    var co2 = Math.round(sheets * ECO.CO2_PER_SHEET_G);
    var o2 = Math.round(co2 * ECO.O2_RATIO);
    var water = Math.round(sheets * ECO.WATER_PER_SHEET_L);
    return { L: L, M: M, sheets: sheets, co2: co2, o2: o2, water: water };
  }

  /* ---------- Mount ---------- */
  function mount(rows) {
    var d = compute(rows);
    if (!d.sheets) return;
    injectCSS();

    var card = document.createElement("div");
    card.id = "ecoCard";
    card.innerHTML = buildHTML(d);

    var anchor = document.getElementById("leaveKpi");
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(card, anchor);
    else {
      var leave = document.querySelector(".rrep.leave") || document.body;
      leave.insertBefore(card, leave.firstChild);
    }

    /* đếm khi cuộn tới (giống các section khác) */
    var ran = false;
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting && !ran) { ran = true; animate(card, d); io.disconnect(); } });
      }, { threshold: 0.25 });
      io.observe(card);
    } else { animate(card, d); }
  }

  /* ---------- Load data ---------- */
  function init() {
    if (Array.isArray(window.dataLMreport)) { mount(window.dataLMreport); return; }
    fetch(ECO.DATA_URL + "?cache=" + Date.now())
      .then(function (r) { return r.json(); })
      .then(mount)
      .catch(function (err) { console.warn("[ecoSaving] không đọc được " + ECO.DATA_URL, err); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();