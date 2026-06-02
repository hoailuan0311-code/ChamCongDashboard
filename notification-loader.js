(async function(){
if(typeof ACTIVE_NOTIFICATION==="undefined" || !ACTIVE_NOTIFICATION.enabled) return;

let INFORM_DATA;
try{
  const res=await fetch("notifications/"+ACTIVE_NOTIFICATION.file+"?v="+Date.now());
  INFORM_DATA=await res.json();
}catch(e){console.error("Sport Loader Error:",e);return;}

const css=`
#sportPopup{position:fixed;inset:0;background:rgba(0,0,0,.78);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:999999;animation:spFade .35s}
@keyframes spFade{from{opacity:0}to{opacity:1}}
#sportBox{position:relative;width:min(1200px,95vw);max-height:92vh;overflow:auto;background:rgba(255,255,255,.96);border-radius:24px;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.35);font-family:'Be Vietnam Pro',Arial,sans-serif}
#sportTitle{background:linear-gradient(135deg,#dc2626,#f97316,#facc15);color:#fff;padding:18px;border-radius:18px;font-size:32px;font-weight:800;text-align:center}
#closePopup{position:absolute;right:20px;top:20px;border:none;width:42px;height:42px;border-radius:50%;background:#ef4444;color:#fff;cursor:pointer;font-size:18px}
#highlight{margin:15px 0;padding:15px;border-radius:16px;background:#fff7ed;border:2px solid #fb923c;font-size:17px}
#cards{display:grid;grid-template-columns:repeat(2,1fr);gap:15px}
.card{color:#fff;padding:16px;border-radius:18px;transition:.25s;box-shadow:0 10px 25px rgba(0,0,0,.15)}
.card:hover{transform:translateY(-4px)}
.volley{background:linear-gradient(135deg,#2563eb,#60a5fa)}
.football{background:linear-gradient(135deg,#16a34a,#4ade80)}
.badminton{background:linear-gradient(135deg,#ea580c,#fb923c)}
.chess{background:linear-gradient(135deg,#7c3aed,#a78bfa)}
.ctitle{font-size:22px;font-weight:800}
.ccount{margin-top:10px;font-size:18px;font-weight:700}
#slideArea{margin-top:15px;padding:18px;background:#f8fafc;border-radius:18px;animation:fade .5s}
@keyframes fade{from{opacity:.2}to{opacity:1}}
#sportTicker{position:fixed;bottom:0;left:0;width:100%;height:42px;background:#111;color:#fff;display:flex;align-items:center;overflow:hidden;z-index:999997}
#sportTicker span{white-space:nowrap;padding-left:100%;animation:ticker 120s linear infinite}
@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-100%)}}
@media(max-width:768px){
#cards{grid-template-columns:1fr}
#sportTitle{font-size:24px}
.card{padding:14px}
.ctitle{font-size:18px}
.ccount{font-size:15px}
}`;

const st=document.createElement("style");
st.textContent=css;
document.head.appendChild(st);

if(INFORM_DATA.showTicker && INFORM_DATA.ticker?.length){
 const t=document.createElement("div");
 t.id="sportTicker";
 t.innerHTML="<span>"+INFORM_DATA.ticker.join(" • ")+"</span>";
 document.body.appendChild(t);
}

if(!INFORM_DATA.showPopup) return;

const p=document.createElement("div");
p.id="sportPopup";
p.innerHTML=`<div id="sportBox">
<button id="closePopup">✕</button>
<div id="sportTitle">${INFORM_DATA.popupTitle||"🏆 GP SPORT DAY"}</div>
<div id="highlight"></div>
<div id="cards"></div>
<div id="slideArea"></div>
</div>`;
document.body.appendChild(p);
document.getElementById("closePopup").onclick=()=>p.remove();

const next=(kw)=>INFORM_DATA.matches
.filter(x=>x.title.includes(kw)&&new Date(x.datetime.replace(" ","T"))>new Date())
.sort((a,b)=>new Date(a.datetime.replace(" ","T"))-new Date(b.datetime.replace(" ","T")))[0];

const cd=(dt)=>{
 let d=new Date(dt.replace(" ","T"))-new Date();
 if(d<0) return "Đang diễn ra";
 const day=Math.floor(d/86400000);
 const hr=Math.floor(d%86400000/3600000);
 const min=Math.floor(d%3600000/60000);
 const sec=Math.floor(d%60000/1000);
 return `${day} ngày ${hr} giờ ${min} phút ${sec} giây`;
};

function renderCards(){
 const arr=[
 ["🏐 BÓNG CHUYỀN","Bóng chuyền","volley"],
 ["⚽ BÓNG ĐÁ","Bóng đá","football"],
 ["🏸 CẦU LÔNG","Cầu lông","badminton"],
 ["♟️ CỜ VUA","Cờ vua","chess"]
 ];

 document.getElementById("cards").innerHTML=arr.map(a=>{
 const m=next(a[1]);
 const isJIT=m && m.team.includes("Warehouse JIT");
 return `<div class="card ${a[2]}">
 ${isJIT?'<div>⭐ TEAM WAREHOUSE</div>':''}
 <div class="ctitle">${a[0]}</div>
 <div>${m?m.team:"Không có lịch"}</div>
 <div class="ccount">${m?"⏳ "+cd(m.datetime):""}</div>
 </div>`;
 }).join("");
}

renderCards();
setInterval(renderCards,1000);

const jit=INFORM_DATA.matches
.filter(x=>x.team.includes("Warehouse JIT"))
.sort((a,b)=>new Date(a.datetime.replace(" ","T"))-new Date(b.datetime.replace(" ","T")))[0];

if(jit){
 document.getElementById("highlight").innerHTML=
 `🔥 <b>TRẬN ĐÁNG CHÚ Ý</b><br><br>${jit.team}<br><br>${jit.datetime}`;
}

if(INFORM_DATA.slides?.length){
 let i=0;
 const r=()=>{
  const s=INFORM_DATA.slides[i];
  document.getElementById("slideArea").innerHTML=`
  <div style="font-size:24px;font-weight:800;color:#2563eb;margin-bottom:10px">${s.title}</div>
  <div style="font-size:18px;line-height:1.8">${s.content}</div>`;
  i=(i+1)%INFORM_DATA.slides.length;
 };
 r();
 setInterval(r,5000);
}
})();