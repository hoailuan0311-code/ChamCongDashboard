(async function(){

if(typeof ACTIVE_NOTIFICATION === "undefined") return;
if(!ACTIVE_NOTIFICATION.enabled) return;

const res = await fetch(
"notifications/" +
ACTIVE_NOTIFICATION.file +
"?v=" +
Date.now()
);

const INFORM_DATA = await res.json();

window.INFORM_DATA = INFORM_DATA;

/* ===== CSS ===== */

const style = document.createElement("style");

style.innerHTML = `
#sportTicker{
position:fixed;
bottom:0;
left:0;
width:100%;
height:45px;
background:linear-gradient(90deg,#dc2626,#f97316);
color:#fff;
z-index:999999;
overflow:hidden;
display:flex;
align-items:center;
font-weight:700;
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
background:#fff;
border-radius:20px;
padding:25px;
position:relative;
text-align:center;
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

/* ===== TICKER ===== */

const ticker=document.createElement("div");

ticker.id="sportTicker";

ticker.innerHTML=
`<span>${INFORM_DATA.ticker.join(" | ")}</span>`;

document.body.appendChild(ticker);

/* ===== POPUP ===== */

const popup=document.createElement("div");

popup.id="sportPopup";

popup.innerHTML=`

<div id="sportBox">

<button id="closePopup">✕</button>

<h1>${INFORM_DATA.popupTitle}</h1>

<div id="countdown"></div>

<div id="slideArea"></div>

</div>
`;

document.body.appendChild(popup);

document.getElementById("closePopup").onclick=()=>{
popup.remove();
};

let slideIndex=0;

function renderSlide(){

const slide=
INFORM_DATA.slides[slideIndex];

document.getElementById("slideArea").innerHTML=
`

<h2>${slide.title}</h2>
<div>${slide.content}</div>
`;

slideIndex++;

if(slideIndex>=INFORM_DATA.slides.length){
slideIndex=0;
}

}

renderSlide();

setInterval(renderSlide,5000);

function updateCountdown(){

const target=
new Date(
INFORM_DATA.nextMatch.datetime.replace(" ","T")
);

const diff=
target-new Date();

if(diff<=0) return;

const d=Math.floor(diff/86400000);
const h=Math.floor(diff%86400000/3600000);
const m=Math.floor(diff%3600000/60000);
const s=Math.floor(diff%60000/1000);

document.getElementById("countdown").innerHTML=
`⏳ ${d} ngày ${h} giờ ${m} phút ${s} giây`;
}

updateCountdown();

setInterval(updateCountdown,1000);

})();
