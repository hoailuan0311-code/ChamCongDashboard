(async function(){

if(typeof ACTIVE_NOTIFICATION==="undefined") return;
if(!ACTIVE_NOTIFICATION.enabled) return;

let INFORM_DATA;

try{

const res=await fetch(
"notifications/" +
ACTIVE_NOTIFICATION.file +
"?v=" +
Date.now()
);

INFORM_DATA=await res.json();

}catch(err){

console.error("Notification Load Error:",err);

return;

}

const style=document.createElement("style");

style.innerHTML=`

#sportTicker{
position:fixed;
bottom:0;
left:0;
width:100%;
height:45px;
background:linear-gradient(90deg,#dc2626,#f97316);
color:white;
z-index:999999;
overflow:hidden;
display:flex;
align-items:center;
font-weight:700;
box-shadow:0 -3px 15px rgba(0,0,0,.3);
}

#sportTicker span{
white-space:nowrap;
padding-left:100%;
animation:sportTickerMove 45s linear infinite;
}

@keyframes sportTickerMove{
from{transform:translateX(0);}
to{transform:translateX(-100%);}
}

#sportPopup{
position:fixed;
inset:0;
background:rgba(0,0,0,.8);
display:flex;
justify-content:center;
align-items:center;
z-index:999999;
}

#sportBox{
width:800px;
max-width:90%;
background:white;
border-radius:20px;
padding:25px;
position:relative;
text-align:center;
}

#sportTitle{
font-size:30px;
font-weight:800;
color:#dc2626;
margin-bottom:15px;
}

#countdown{
background:#111827;
color:#facc15;
padding:12px;
border-radius:12px;
margin-bottom:20px;
font-size:20px;
font-weight:700;
}

.slide-title{
font-size:28px;
font-weight:800;
color:#2563eb;
margin-bottom:15px;
}

.slide-content{
font-size:22px;
line-height:1.8;
}

#closePopup{
position:absolute;
top:15px;
right:15px;
width:40px;
height:40px;
border:none;
border-radius:50%;
background:#ef4444;
color:white;
cursor:pointer;
}

`;

document.head.appendChild(style);

/* TICKER */

if(INFORM_DATA.showTicker &&
INFORM_DATA.ticker &&
INFORM_DATA.ticker.length){

const ticker=document.createElement("div");

ticker.id="sportTicker";

ticker.innerHTML=
`<span>${INFORM_DATA.ticker.join(" | ")}</span>`;

document.body.appendChild(ticker);

}

/* POPUP */

if(INFORM_DATA.showPopup){

const popup=document.createElement("div");

popup.id="sportPopup";

popup.innerHTML=`

<div id="sportBox">

<button id="closePopup">✕</button>

<div id="sportTitle">
${INFORM_DATA.popupTitle || "Thông báo"}
</div>

<div id="countdown"></div>

<div id="slideArea"></div>

</div>

`;

document.body.appendChild(popup);

document.getElementById("closePopup").onclick=()=>{
popup.remove();
};

/* SLIDES */

if(
INFORM_DATA.slides &&
INFORM_DATA.slides.length
){

let slideIndex=0;

function renderSlide(){

const slide=
INFORM_DATA.slides[slideIndex];

document.getElementById("slideArea").innerHTML=
`

<div class="slide-title">
${slide.title || ""}
</div>

<div class="slide-content">
${slide.content || ""}
</div>

`;

slideIndex++;

if(slideIndex>=INFORM_DATA.slides.length){

slideIndex=0;

}

}

renderSlide();

setInterval(renderSlide,5000);

}

/* AUTO NEXT MATCH */

if(
INFORM_DATA.showCountdown &&
INFORM_DATA.matches &&
INFORM_DATA.matches.length
){

function getNextMatch(){

const now=new Date();

const upcoming=
INFORM_DATA.matches
.filter(match=>
new Date(
match.datetime.replace(" ","T")
)>now
)
.sort((a,b)=>
new Date(a.datetime.replace(" ","T"))

new Date(b.datetime.replace(" ","T"))
);

return upcoming[0];

}

function updateCountdown(){

const nextMatch=getNextMatch();

if(!nextMatch){

document.getElementById("countdown").innerHTML=
"🏆 TẤT CẢ NỘI DUNG THI ĐẤU ĐÃ HOÀN THÀNH";

return;

}

const target=
new Date(
nextMatch.datetime.replace(" ","T")
);

const diff=
target-new Date();

const d=Math.floor(diff/86400000);
const h=Math.floor(diff%86400000/3600000);
const m=Math.floor(diff%3600000/60000);
const s=Math.floor(diff%60000/1000);

document.getElementById("countdown").innerHTML=
`
⏳ Trận tiếp theo

<br><br>

<b>${nextMatch.title}</b>

<br>

${nextMatch.team}

<br><br>

${d} ngày ${h} giờ ${m} phút ${s} giây
`;

}

updateCountdown();

setInterval(updateCountdown,1000);

}else{

document.getElementById("countdown").style.display="none";

}

}

})();
