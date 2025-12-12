/* noel_extreme3.js
   NOEL EXTREME 3.0 — FULL ENGINE
   - Snow engine (pixel accumulation per element + follow scroll)
   - Wind blow physics (gusts)
   - Santa helicopter (rappel + gift drop)
   - Reindeer + sleigh with emergency brake + drift
   - LED border + sparkle
   Notes: Put images in theme/img/
*/

(function NOEL_EXTREME_3(){
  // ---------- CONFIG ----------
  const MAX_FLAKES = 220;            // max concurrent falling flakes
  const ACC_WIDTH = 2;               // accumulation resolution (px per column)
  const ACC_MAX_HEIGHT = 120;        // max accumulation per element (px)
  const FLAKE_RATE_MS = 80;         // spawn interval
  const WIND_GUST_FREQ = 15000;     // ms between gust opportunities
  const WIND_DURATION = 3500;       // gust length ms
  const PERFORMANCE_MODE_THRESHOLD = 600; // viewport width -> reduce effects below
  const TARGET_SELECTORS = [
    "h1", ".search-bar", "table", ".chart-box", ".feedback-btn", "#dataTable"
  ];

  // ---------- UTIL ----------
  function $(s){ return document.querySelectorAll(s); }
  function rand(min, max){ return Math.random()*(max-min)+min; }
  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
  function now(){ return performance.now(); }

  // ---------- LAYERS & CANVAS ----------
  const rootLayer = document.createElement("div");
  rootLayer.id = "noel-root-layer";
  Object.assign(rootLayer.style, {
    position: "fixed", left:0, top:0, width:"100%", height:"100%",
    pointerEvents:"none", zIndex: 99990
  });
  document.body.appendChild(rootLayer);

  const flakeLayer = document.createElement("canvas");
  flakeLayer.id = "noel-flake-canvas";
  Object.assign(flakeLayer.style, {position:"absolute", left:0, top:0});
  rootLayer.appendChild(flakeLayer);
  const fctx = flakeLayer.getContext("2d");

  const accLayer = document.createElement("canvas");
  accLayer.id = "noel-acc-canvas";
  Object.assign(accLayer.style, {position:"absolute", left:0, top:0});
  rootLayer.appendChild(accLayer);
  const actx = accLayer.getContext("2d");

  // Responsive size
  function resizeCanvases(){
    const w = window.innerWidth, h = window.innerHeight;
    [flakeLayer, accLayer].forEach(c => { c.width = w; c.height = h; c.style.width = w + "px"; c.style.height = h + "px"; });
  }
  resizeCanvases();
  window.addEventListener("resize", resizeCanvases);

  // ---------- TRACKED ELEMENTS & ACCUMULATION DATA ----------
  // Each tracked element -> {el, rect, accMap: Uint16Array, cols, left, top, width, height}
  const tracked = [];

  function pickElements(){
    tracked.length = 0;
    TARGET_SELECTORS.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        // skip invisible or zero-size
        const r = el.getBoundingClientRect();
        if (r.width < 20 || r.height < 8) return;
        // create entry
        const cols = Math.max(4, Math.floor(r.width / ACC_WIDTH));
        const accMap = new Uint16Array(cols); // heights per column
        tracked.push({
          el, accMap, cols,
          left: r.left + window.scrollX,
          top: r.top + window.scrollY,
          width: r.width, height: r.height,
          rect: r, lastRectUpdate: now()
        });
      });
    });
  }
  pickElements();

  // Update rect positions occasionally or on scroll
  let lastScroll = window.scrollY;
  window.addEventListener("scroll", () => {
    // minor throttle
    if (Math.abs(window.scrollY - lastScroll) > 20) {
      updateRects();
      lastScroll = window.scrollY;
    }
  }, {passive:true});
  function updateRects(){
    tracked.forEach(t => {
      const r = t.el.getBoundingClientRect();
      t.left = r.left + window.scrollX;
      t.top  = r.top + window.scrollY;
      t.width = r.width; t.height = r.height; t.rect = r;
      // adjust columns if size changed
      const newCols = Math.max(4, Math.floor(t.width / ACC_WIDTH));
      if (newCols !== t.cols){
        const newMap = new Uint16Array(newCols);
        newMap.set(t.accMap.subarray(0, Math.min(newCols, t.cols)));
        t.accMap = newMap;
        t.cols = newCols;
      }
      t.lastRectUpdate = now();
    });
  }

  // Refresh elements every 6s (handles DOM changes)
  setInterval(() => { pickElements(); }, 6000);

  // ---------- SNOW FLAKES (falling) ----------
  const flakes = []; // {x,y,vy,size,alpha,hitTarget?}
  function spawnFlake(){
    if (flakes.length >= MAX_FLAKES) return;
    const x = rand(0, innerWidth);
    const size = rand(8, 18);
    const vy = rand(30, 120) / 100; // px per frame scale
    const alpha = rand(0.4, 0.95);
    flakes.push({x,y:-20,vy,size,alpha, wobble: rand(0.2,0.9), life:0});
  }

  // Find if flake hits any tracked element (by position)
  function tryAccumulate(f){
    // world coords of flake bottom
    const fx = f.x, fy = f.y + f.size/2 + window.scrollY - 0;
    for (let t of tracked){
      // transform element rect to world coords (page)
      const topPage = t.top;
      const leftPage = t.left;
      const rightPage = leftPage + t.width;
      const bottomPage = topPage + t.height;
      if (fx >= leftPage && fx <= rightPage && fy >= topPage && fy <= bottomPage + 60){
        // compute local column
        const col = Math.floor(((fx - leftPage) / t.width) * t.cols);
        if (col>=0 && col < t.cols){
          // increase accumulation
          t.accMap[col] = clamp(t.accMap[col] + f.size * 0.22, 0, ACC_MAX_HEIGHT);
          return true;
        }
      }
    }
    return false;
  }

  // ---------- WIND / GUST ----------
  let gust = {active:false, sx:0, strength:0, since:0};
  function maybeGust(){
    if (Math.random() < 0.5) {
      const strength = rand(1.2, 3.6);
      gust = {active:true, sx: Math.random()<0.5?-1:1, strength, since: now()};
      setTimeout(()=> { gust.active=false; }, WIND_DURATION);
    }
  }
  setInterval(maybeGust, WIND_GUST_FREQ);

  // ---------- DRAW LOOP ----------
  let lastFrame = now();
  function frame(){
    const tNow = now();
    const dt = (tNow - lastFrame) / 16.6667; // approx frames
    lastFrame = tNow;

    // clear
    fctx.clearRect(0,0,flakeLayer.width, flakeLayer.height);
    actx.clearRect(0,0,accLayer.width, accLayer.height);

    // update flakes
    for (let i=flakes.length-1;i>=0;i--){
      const f = flakes[i];
      // wind wobble
      const windEffect = gust.active ? gust.strength * gust.sx * 0.5 : 0;
      f.x += Math.sin(f.life * 0.05) * f.wobble + windEffect * (f.size/14);
      f.y += f.vy * dt * (1 + (f.size/18));
      f.life += dt;
      // draw flake (simple circle)
      fctx.globalAlpha = f.alpha;
      const grd = fctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size);
      grd.addColorStop(0, "rgba(255,255,255,1)");
      grd.addColorStop(0.8, "rgba(255,255,255,0.6)");
      grd.addColorStop(1, "rgba(255,255,255,0)");
      fctx.fillStyle = grd;
      fctx.beginPath();
      fctx.arc(f.x, f.y, f.size/2, 0, Math.PI*2);
      fctx.fill();

      // collision with bottom or targets
      if (f.y > innerHeight + 40 || tryAccumulate(f)){
        flakes.splice(i,1);
      }
    }

    // draw accumulations anchored to elements (world coords -> screen)
    for (let t of tracked){
      // top of element relative to viewport
      const rect = t.el.getBoundingClientRect();
      const leftScreen = rect.left;
      const topScreen  = rect.top;
      // draw accumulation above element top
      const baseY = clamp(topScreen, 0, window.innerHeight) ; // screen y position
      // iterate columns
      const colW = t.width / t.cols;
      for (let c=0;c<t.cols;c++){
        const h = t.accMap[c] || 0;
        if (h > 0.5){
          const x = leftScreen + c*colW;
          // draw soft rounded deposit
          actx.fillStyle = "rgba(255,255,255,0.95)";
          actx.beginPath();
          actx.moveTo(x, baseY);
          actx.quadraticCurveTo(x + colW/2, baseY - h, x + colW, baseY);
          actx.lineTo(x + colW, baseY + 1);
          actx.lineTo(x, baseY + 1);
          actx.fill();
          // subtle shadow
          actx.fillStyle = "rgba(0,0,0,0.02)";
          actx.fillRect(x, baseY + 1, colW, 1);
        }
      }
    }

    // occasionally apply small melt / settle (very slight)
    if (Math.random() < 0.01){
      for (let t of tracked){
        for (let c=0;c<t.cols;c++){
          t.accMap[c] = Math.max(0, t.accMap[c] - rand(0,0.6));
        }
      }
    }

    requestAnimationFrame(frame);
  }

  // start
  requestAnimationFrame(frame);

  // spawn flakes steadily
  setInterval(()=> { spawnFlake(); }, FLAKE_RATE_MS);

  // ---------- WIND BLOW (gusts remove accumulation + particle) ----------
  function blowAt(elementRect, dir = 1, strength = 1.6){
    // puff particles
    const px = elementRect.left + elementRect.width/2 - window.scrollX;
    const py = elementRect.top - window.scrollY + 10;
    for (let i=0;i<28;i++){
      const p = document.createElement("div");
      p.style.position = "fixed";
      p.style.left = px + rand(-elementRect.width/2, elementRect.width/2) + "px";
      p.style.top  = py + rand(-10,10) + "px";
      p.style.width = p.style.height = (2 + Math.random()*6) + "px";
      p.style.background = "rgba(255,255,255,0.9)";
      p.style.borderRadius = "50%";
      p.style.zIndex = 99999;
      p.style.pointerEvents = "none";
      document.body.appendChild(p);
      let vx = rand(2,8)*dir*strength, vy = rand(-2, 4);
      let life = 0;
      (function anim(){
        life++;
        p.style.left = (parseFloat(p.style.left) + vx) + "px";
        p.style.top  = (parseFloat(p.style.top)  + vy) + "px";
        p.style.opacity = Math.max(0, 1 - life/30);
        vx *= 0.98; vy += 0.12;
        if (life < 30) requestAnimationFrame(anim);
        else p.remove();
      })();
    }

    // remove accumulation from elements overlapping region
    tracked.forEach(t => {
      const r = t.el.getBoundingClientRect();
      const midX = (r.left + r.right)/2;
      // if x overlap then reduce acc
      if (Math.abs(midX - (elementRect.left + elementRect.width/2)) < window.innerWidth){
        for (let c=0;c<t.cols;c++){
          t.accMap[c] = Math.max(0, t.accMap[c] - Math.random()*40*strength);
        }
      }
    });
  }

  // schedule gusts that target random tracked element
  setInterval(() => {
    if (tracked.length === 0) return;
    const t = tracked[Math.floor(Math.random()*tracked.length)];
    const dir = Math.random()<0.5 ? -1 : 1;
    blowAt(t.el.getBoundingClientRect(), dir, rand(0.9,2.6));
  }, WIND_GUST_FREQ + rand(-4000,4000));

  // ---------- SANTA HELI (rappel + gift) ----------
  const heli = document.createElement("img");
  heli.src = "theme/img/helicopter.png";
  heli.alt = "helicopter";
  heli.style.position = "fixed";
  heli.style.width = "220px";
  heli.style.left = "-260px";
  heli.style.top = "60px";
  heli.style.zIndex = 99996;
  heli.style.pointerEvents = "none";
  heli.style.transformOrigin = "center";
  heli.onerror = ()=> { heli.style.display = "none"; };
  document.body.appendChild(heli);

  const santaImg = document.createElement("img");
  santaImg.src = "theme/img/santa.png";
  santaImg.alt = "santa";
  santaImg.style.position = "fixed";
  santaImg.style.width = "120px";
  santaImg.style.left = "-260px";
  santaImg.style.top = "200px";
  santaImg.style.zIndex = 99997;
  santaImg.style.pointerEvents = "none";
  santaImg.onerror = ()=> { santaImg.style.display = "none"; };
  document.body.appendChild(santaImg);

  let heliX = -300, heliSpeed = 1.6, heliDir = 1, heliPhase = 0;
  function heliLoop(){
    heliX += heliSpeed * heliDir;
    heli.style.left = heliX + "px";
    santaImg.style.left = (heliX + 40) + "px";
    // bob
    heli.style.top = 40 + Math.sin(heliX*0.01)*8 + "px";
    santaImg.style.top = (60 + Math.sin(heliX*0.02)*6) + "px";
    // occasionally rappel
    if (Math.random() < 0.003) rappelGift(heliX + 40);
    if (heliX > innerWidth + 320) heliX = -320;
    requestAnimationFrame(heliLoop);
  }
  requestAnimationFrame(heliLoop);

  function rappelGift(cx){
    // drop a gift at x = cx
    const gift = document.createElement("img");
    gift.src = "theme/img/gift.png";
    gift.style.position = "fixed";
    gift.style.left = cx + "px";
    gift.style.top = (parseFloat(santaImg.style.top) + 60) + "px";
    gift.style.width = "28px";
    gift.style.zIndex = 99998;
    gift.style.pointerEvents = "none";
    gift.onerror = ()=> { gift.style.background = "gold"; gift.style.width="12px"; gift.style.height="12px"; };
    document.body.appendChild(gift);
    let gy = parseFloat(gift.style.top);
    let vx = rand(-0.4,0.4), vy = 1.2;
    let life = 0;
    (function fall(){
      life++;
      gy += vy;
      gift.style.top = gy + "px";
      gift.style.left = parseFloat(gift.style.left) + vx + "px";
      vy += 0.04;
      if (gy < innerHeight - 40) requestAnimationFrame(fall);
      else {
        // sparkle
        sparkle(parseFloat(gift.style.left), gy);
        gift.remove();
      }
    })();
  }

  function sparkle(x,y){
    for (let i=0;i<14;i++){
      const p = document.createElement("div");
      p.style.position = "fixed";
      p.style.left = x + "px"; p.style.top = y + "px";
      p.style.width = p.style.height = (3 + Math.random()*6) + "px";
      p.style.background = ["#ffef7a","#ffd2e6","#b6f3ff","#fff"][Math.floor(Math.random()*4)];
      p.style.borderRadius = "50%";
      p.style.zIndex = 99999;
      document.body.appendChild(p);
      let life=0, angle = Math.random()*Math.PI*2, speed = 1 + Math.random()*3;
      (function anim(){
        life++;
        p.style.left = parseFloat(p.style.left) + Math.cos(angle)*speed*life*0.02 + "px";
        p.style.top  = parseFloat(p.style.top)  + Math.sin(angle)*speed*life*0.02 + "px";
        p.style.opacity = Math.max(0,1 - life/30);
        if (life < 30) requestAnimationFrame(anim);
        else p.remove();
      })();
    }
  }

  // ---------- REINDEER + SLEIGH (drift & emergency brake) ----------
  const sleigh = document.createElement("img");
  sleigh.src = "theme/img/reindeer_sleigh.png";
  sleigh.style.position = "fixed";
  sleigh.style.left = "-300px";
  sleigh.style.bottom = "30px";
  sleigh.style.width = "260px";
  sleigh.style.zIndex = 99995;
  sleigh.style.pointerEvents = "none";
  sleigh.onerror = ()=> { sleigh.style.display = "none"; };
  document.body.appendChild(sleigh);

  let sleighX = -300, sleighSpeed = 3.2;
  let sleighState = "run"; // run, brake, drift
  function sleighLoop(){
    sleighX += sleighSpeed;
    sleigh.style.left = sleighX + "px";

    // random brake event
    if (Math.random() < 0.01){
      sleighState = "brake";
      sleighSpeed = 0.6;
      // generate skid dust and drift
      for (let i=0;i<12;i++){
        dustTrail(sleighX + 60 + i*3, parseFloat(sleigh.style.bottom) + 40);
      }
      setTimeout(()=> {
        sleighState = "drift";
        sleighSpeed = 2.5;
        // leave bright trail
        for (let j=0;j<20;j++){ lightTrail(sleighX + j*10, parseFloat(sleigh.style.bottom) + 20); }
        setTimeout(()=> { sleighState = "run"; sleighSpeed = 3.2; }, 1200);
      }, 200);
    }

    if (sleighX > innerWidth + 300) sleighX = -400;
    requestAnimationFrame(sleighLoop);
  }
  requestAnimationFrame(sleighLoop);

  function dustTrail(x,y){
    const p = document.createElement("div");
    p.style.position = "fixed";
    p.style.left = x + "px";
    p.style.bottom = y + "px";
    p.style.width = p.style.height = (4 + Math.random()*8) + "px";
    p.style.background = "rgba(255,255,255,0.85)";
    p.style.borderRadius = "30%";
    p.style.zIndex = 99994;
    document.body.appendChild(p);
    let life = 0;
    (function anim(){
      life++;
      p.style.transform = `translateY(${ -life * 0.6 }px) scale(${1 - life/30})`;
      p.style.opacity = Math.max(0, 1 - life/30);
      if (life < 30) requestAnimationFrame(anim);
      else p.remove();
    })();
  }

  function lightTrail(x, bottom){
    const e = document.createElement("div");
    e.style.position = "fixed";
    e.style.left = x + "px";
    e.style.bottom = bottom + "px";
    e.style.width = "8px"; e.style.height = "3px";
    e.style.background = "linear-gradient(90deg,#fff6,#ffd)";
    e.style.borderRadius = "4px";
    e.style.zIndex = 99994;
    document.body.appendChild(e);
    let life = 0;
    (function anim(){
      life++;
      e.style.opacity = Math.max(0, 1 - life/25);
      e.style.transform = `translateX(${life*6}px)`;
      if (life < 25) requestAnimationFrame(anim);
      else e.remove();
    })();
  }

  // ---------- LED BORDER (subtle) ----------
  const ledContainer = document.createElement("div");
  ledContainer.style.position = "fixed";
  ledContainer.style.left = 0;
  ledContainer.style.top = 0;
  ledContainer.style.width = "100%";
  ledContainer.style.height = "100%";
  ledContainer.style.pointerEvents = "none";
  ledContainer.style.zIndex = 99989;
  document.body.appendChild(ledContainer);

  // create lights along top & bottom edges
  function paintLEDs(){
    ledContainer.innerHTML = "";
    const count = Math.min(80, Math.floor(window.innerWidth / 18));
    for (let i=0;i<count;i++){
      const d = document.createElement("div");
      d.style.position = "absolute";
      d.style.width = d.style.height = "10px";
      d.style.left = (i*(window.innerWidth/count)) + "px";
      d.style.top  = (i%2===0 ? "6px" : (window.innerHeight - 16) + "px");
      d.style.background = ["#ff4d4d","#ffd24d","#8ef","#7eff8a"][i%4];
      d.style.borderRadius = "50%";
      d.style.opacity = 0.6;
      d.style.filter = "drop-shadow(0 1px 4px rgba(0,0,0,0.2))";
      d.style.animation = `noel-led-blink ${0.9 + Math.random()*0.6}s infinite`;
      ledContainer.appendChild(d);
    }
  }
  const ledCss = document.createElement("style");
  ledCss.innerHTML = `@keyframes noel-led-blink {0%{opacity:.2;}50%{opacity:1;}100%{opacity:.25;}}`;
  document.head.appendChild(ledCss);
  paintLEDs();
  window.addEventListener("resize", paintLEDs);

  // ---------- INITIALIZE & PERFORMANCE TWEAK ----------
  function init(){
    // if very small screen, reduce flake rate
    if (window.innerWidth < PERFORMANCE_MODE_THRESHOLD) {
      // lighten
    }
    // populate initial elements
    pickElements();
  }
  init();

  // ---------- PUBLIC: allow external blow trigger ----------
  window.NOEL = window.NOEL || {};
  window.NOEL.triggerGust = function(direction=1, strength=1.5){
    if (tracked.length === 0) { pickElements(); }
    const target = tracked[Math.floor(Math.random()*tracked.length)];
    if (target) blowAt(target.el.getBoundingClientRect(), direction, strength);
  };

  // ---------- ensure canvases positioned above page content (but below sprites) ----------
  flakeLayer.style.zIndex = 99988;
  accLayer.style.zIndex = 99989;

  // ---------- garbage: remove after long inactivity? (no) ----------
  // keep running as theme effect

  console.log("noel_extreme3 initialized - full engine active");
})();
