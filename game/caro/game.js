/***********************************************************
 * game.js — Caro (Gomoku) Full with Firebase & new AI
 ***********************************************************/

/* ========== CONFIG ========== */

const COLS = 30, ROWS = 20, WIN = 5;
// TURN timeout changed to 60 seconds as requested
const TURN_TIMEOUT = 60;

/* ========== YOUR FIREBASE CONFIG (CRIS) ========== */
const firebaseConfig = {
  apiKey: "AIzaSyAlt_eOEIeJn6qPt-f0Og12W3n6eT7k534",
  authDomain: "cris-caro.firebaseapp.com",
  databaseURL: "https://cris-caro-default-rtdb.firebaseio.com",
  projectId: "cris-caro",
  storageBucket: "cris-caro.firebasestorage.app",
  messagingSenderId: "139601038920",
  appId: "1:139601038920:web:cf267b64b89fb2f614127d"
};

/* ========== DOM refs ========== */
const playerNameInput = document.getElementById('playerName');
const modeSelect = document.getElementById('modeSelect');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');

const onlineOptions = document.getElementById('onlineOptions');
const createRoomBtn = document.getElementById('createRoomBtn');
const roomInput = document.getElementById('roomInput');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const roomStatus = document.getElementById('roomStatus');

const gameArea = document.getElementById('gameArea');
const turnLabel = document.getElementById('turnLabel');
const statusLabel = document.getElementById('statusLabel');
const timerLabel = document.getElementById('timer');

const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChat');

const leaderList = document.getElementById('leaderList');

/* ========== STATE ========== */
let board = [];
let cells = [];
let turn = 'X';
let playing = false;
let mode = 'ai';
let roomId = null;
let isHost = false;
let mySymbol = 'X';
let isSpectator = false;

let timerInterval = null;
let timerRemaining = TURN_TIMEOUT;

/* Firebase runtime */
let firebaseEnabled = false;
let db = null;
let roomMovesRef = null;
let roomStateRef = null;
let roomChatRef = null;

/* store room players locally */
let roomMeta = { hostName: null, guestName: null };

/* ========== Add minimal CSS for last-move highlight (injected) ========== */
(function injectStyles(){
  const s = document.createElement('style');
  s.textContent = `
    .cell.last-move { outline: 3px solid #00d9ff; animation: lastMovePulse 0.6s ease-out; }
    @keyframes lastMovePulse { from { outline-color: #ffffff; } to { outline-color: #00d9ff; } }
    .cell.x { color: #00ff7f; font-weight:700; text-align:center; }
    .cell.o { color: #ff6b6b; font-weight:700; text-align:center; }
    /* some safety so cells show visually even without external CSS */
    #gameArea { display: grid; gap: 2px; }
    .cell { background: rgba(255,255,255,0.02); display:flex; align-items:center; justify-content:center; font-size:18px; border-radius:2px;}
  `;
  document.head.appendChild(s);
})();

/* ========== Firebase Init ========== */
function initFirebase() {
  try {
    const app = firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    firebaseEnabled = true;
    console.log("Firebase initialized.");
  } catch (err) {
    console.error("Firebase init failed:", err);
    firebaseEnabled = false;
  }
}
initFirebase();

/* ========== Board Helpers ========== */
function makeEmptyBoard() {
  board = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null));
}

function flatBoard() {
  return board.flat();
}

function loadBoardFromFlat(arr) {
  makeEmptyBoard();
  for (let r=0; r<ROWS; r++) {
    for (let c=0; c<COLS; c++) {
      const v = arr[r*COLS + c];
      board[r][c] = (v === 'X' || v === 'O') ? v : null;
    }
  }
}

/* ========== Render Board ========== */
function renderBoard() {
  gameArea.innerHTML = "";
  cells = [];
  gameArea.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
  gameArea.style.gridTemplateRows = `repeat(${ROWS}, 1fr)`;

  for (let r=0; r<ROWS; r++) {
    for (let c=0; c<COLS; c++) {
      const el = document.createElement('div');
      el.className = 'cell';
      el.dataset.r = r;
      el.dataset.c = c;
      el.addEventListener("click", onCellClick);
      gameArea.appendChild(el);
      cells.push(el);
    }
  }
  updateCells();
}

function updateCells() {
  for (let r=0; r<ROWS; r++) {
    for (let c=0; c<COLS; c++) {
      const el = cellBy(r,c);
      el.className = "cell";
      el.textContent = "";
      const v = board[r][c];
      if (v === "X") {
        el.classList.add("x");
        el.textContent = "X";
      }
      else if (v === "O") {
        el.classList.add("o");
        el.textContent = "O";
      }
    }
  }
}

function cellBy(r,c) {
  return cells[r * COLS + c];
}

/* highlight last move helper */
function highlightLastMove(r,c) {
  if (!cells || cells.length===0) return;
  cells.forEach(el => el.classList.remove('last-move'));
  const el = cellBy(r,c);
  if (el) el.classList.add('last-move');
}

/* ========== Player name helpers ========== */
function getNameForSymbol(sym) {
  // if online and room meta available, use host/guest
  if (mode === 'online' && roomMeta) {
    if (sym === 'X') return roomMeta.hostName || (isHost? (playerNameInput.value||'Host') : 'Player X');
    if (sym === 'O') return roomMeta.guestName || (!isHost? (playerNameInput.value||'Guest') : 'Player O');
  }
  // local/ai fallback
  if (mode === 'ai') {
    if (sym === 'X') return playerNameInput.value.trim() || 'Bạn';
    return 'Cris (AI)';
  }
  // default
  return sym;
}

/* enhanced setTurnLabel: accept symbol or free text */
function setTurnLabel(symOrText) {
  if (symOrText === 'X' || symOrText === 'O') {
    turnLabel.textContent = `Lượt hiện tại: ${getNameForSymbol(symOrText)}`;
  } else {
    turnLabel.textContent = `Lượt hiện tại: ${symOrText}`;
  }
}

function setStatus(s) { statusLabel.textContent = `Trạng thái: ${s}`; }
/* =========================
   PHẦN 2 — Move logic, Online helpers, Chat, Room share
   ========================= */

/* ========== Board utilities ========== */
function boardIsFull() {
  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) if (!board[r][c]) return false;
  return true;
}

/* ========== Move handlers (UI click) ========== */
function onCellClick(e) {
  if (!playing) return;
  if (isSpectator) return; // spectators cannot place
  const r = parseInt(e.currentTarget.dataset.r,10);
  const c = parseInt(e.currentTarget.dataset.c,10);
  if (board[r][c]) return;

  if (mode === 'online') {
    if (!firebaseEnabled) { alert('Firebase chưa cấu hình'); return; }
    if (turn !== mySymbol) return;
    makeAndPushMove(r,c,mySymbol);
    return;
  }

  // local or ai
  makeAndApplyMove(r,c, turn);
  highlightLastMove(r,c);

  // check win
  const line = checkWinWithLine(r,c,turn);
  if (line) {
    highlightWin(line);
    playing = false;
    setStatus(`${getNameForSymbol(turn)} thắng!`);
    saveLocalResult(getNameForSymbol('X'), getNameForSymbol('O'), getNameForSymbol(turn), {type:'local'});
    pushGameResult(getNameForSymbol(turn), getNameForSymbol('X'), getNameForSymbol('O'), {type:'local'});
    stopTimer();
    return;
  }

  if (boardIsFull()) {
    playing = false;
    setStatus('Hòa!');
    saveLocalResult(getNameForSymbol('X'), getNameForSymbol('O'),'Hòa',{type:'local'});
    pushGameResult('Hòa', getNameForSymbol('X'), getNameForSymbol('O'), {type:'local'});
    stopTimer();
    return;
  }

  // toggle turn
  turn = (turn === 'X') ? 'O' : 'X';
  setTurnLabel(turn);
  resetTimer();

  // AI turn (if playing vs AI)
  if (mode === 'ai' && playing && turn === 'O') {
    setStatus('Cris đang suy nghĩ...');
    setTimeout(()=> {
      const mv = AI_getMove(board, 'O');
      if (!mv) { playing=false; setStatus('Hòa!'); saveLocalResult(getNameForSymbol('X'), getNameForSymbol('O'),'Hòa'); pushGameResult('Hòa', getNameForSymbol('X'), getNameForSymbol('O')); stopTimer(); return; }
      makeAndApplyMove(mv.r,mv.c,'O');
      highlightLastMove(mv.r,mv.c);
      const line2 = checkWinWithLine(mv.r,mv.c,'O');
      if (line2) {
        highlightWin(line2);
        playing = false;
        setStatus('Cris (AI) thắng!');
        saveLocalResult(getNameForSymbol('X'), getNameForSymbol('O'),'Cris');
        pushGameResult('Cris (AI)', getNameForSymbol('X'), getNameForSymbol('O'), {type:'ai'});
        stopTimer();
        return;
      }
      // back to player
      turn = 'X'; setTurnLabel(turn);
      setStatus('Lượt bạn');
      resetTimer();
    }, 180);
  }
}

/* apply move locally (no network) */
function makeAndApplyMove(r,c,who) {
  board[r][c] = who;
  updateCells();
}

/* ========== Online: push move to Firebase ========== */
function makeAndPushMove(r,c,who) {
  if (!firebaseEnabled || !roomId) { alert('Online chưa bật hoặc chưa vào phòng'); return; }
  const movesRef = db.ref(`caro_rooms/${roomId}/moves`);
  const newMv = movesRef.push();
  newMv.set({ r, c, who, t: Date.now() }, err => {
    if (err) { console.warn('Push move failed', err); return; }
    // apply locally immediately for snappy UI
    board[r][c] = who; updateCells();
    highlightLastMove(r,c);
    // update snapshot state
    const stateRef = db.ref(`caro_rooms/${roomId}/state`);
    stateRef.set({ board: flatBoard(), turn: (who==='X'?'O':'X'), lastMove: {r,c,who,t:Date.now()}, meta: roomMeta });

    // check win
    const line = checkWinWithLine(r,c,who);
    if (line) {
      highlightWin(line);
      playing = false;
      setStatus(`${getNameForSymbol(who)} thắng!`);
      const winnerName = getNameForSymbol(who);
      saveLocalResult(getNameForSymbol('X'), getNameForSymbol('O'), winnerName);
      pushGameResult(winnerName, getNameForSymbol('X'), getNameForSymbol('O'), {room: roomId});
      const histRef = db.ref(`caro_rooms/${roomId}/history`);
      histRef.push({ t: Date.now(), winner: winnerName, reason:'win' });
      stopTimer();
    } else {
      turn = (who==='X') ? 'O' : 'X';
      setTurnLabel(turn);
      resetTimer();
    }
  });
}

/* ========== Online: listeners & room functions ========== */
function setupRoomListeners(rid, spectator=false) {
  if (!firebaseEnabled) return;
  roomId = rid; isSpectator = spectator;

  roomMovesRef = db.ref(`caro_rooms/${roomId}/moves`);
  roomStateRef = db.ref(`caro_rooms/${roomId}/state`);
  roomChatRef = db.ref(`caro_rooms/${roomId}/chat`);
  const histRef = db.ref(`caro_rooms/${roomId}/history`);

  // load existing state or init, and read meta (host/guest)
  roomStateRef.once('value').then(snap => {
    const st = snap.val();
    if (st && st.board && st.board.length === ROWS*COLS) {
      loadBoardFromFlat(st.board); updateCells();
      if (st.turn) { turn = st.turn; setTurnLabel(turn); }
      if (st.meta) {
        roomMeta = st.meta;
      }
    } else {
      roomStateRef.set({ board: flatBoard(), turn: 'X', lastMove: null, meta: roomMeta });
    }
  });

  // moves stream
  roomMovesRef.on('child_added', snap => {
    const mv = snap.val();
    if (!mv) return;
    // skip if already played locally
    if (board[mv.r][mv.c]) return;
    board[mv.r][mv.c] = mv.who; updateCells();
    highlightLastMove(mv.r,mv.c);
    const line = checkWinWithLine(mv.r,mv.c,mv.who);
    if (line) {
      highlightWin(line);
      playing = false;
      setStatus(`${getNameForSymbol(mv.who)} thắng!`);
      saveLocalResult(getNameForSymbol('X'), getNameForSymbol('O'), getNameForSymbol(mv.who));
      pushGameResult(getNameForSymbol(mv.who), getNameForSymbol('X'), getNameForSymbol('O'), {room: roomId});
      stopTimer();
    } else {
      turn = mv.who === 'X' ? 'O' : 'X';
      setTurnLabel(turn);
      resetTimer();
    }
  });

  // chat: everyone can send/see messages (spectators too)
  roomChatRef.limitToLast(500).on('child_added', snap => {
    if (snap.exists()) appendChatMessage(snap.val());
  });

  // history
  histRef.limitToLast(10).on('child_added', snap => {
    const it = snap.val();
    if (!it) return;
    roomStatus.textContent = `Phòng ${roomId} — Gần nhất: ${it.winner || '-'}`;
  });

  // show share button + room info
  renderRoomHeader();

  playing = true;
  setStatus('Kết nối phòng — chờ lượt');
  resetTimer();
}

/* create/join room */
function createRoom() {
  if (!firebaseEnabled) { alert('Firebase chưa cấu hình'); return; }
  const id = Math.random().toString(36).slice(2,9);
  roomId = id; isHost = true; mySymbol = 'X'; isSpectator = false;
  roomMeta.hostName = playerNameInput.value.trim() || 'Host';
  roomMeta.guestName = null;
  const rRef = db.ref(`caro_rooms/${roomId}`);
  rRef.set({ createdAt: Date.now(), hostName: roomMeta.hostName, state: { board: flatBoard(), turn: 'X', lastMove: null, meta: roomMeta }}, err=>{
    if (err) { alert('Tạo phòng lỗi'); console.warn(err); }
    else { roomStatus.textContent = `Phòng: ${roomId} (Bạn là Host/X)`; setupRoomListeners(roomId,false); }
  });
}

function joinRoom(id, asSpectator=false) {
  if (!firebaseEnabled) { alert('Firebase chưa cấu hình'); return; }
  if (!id) { alert('Nhập mã phòng'); return; }
  const rRef = db.ref(`caro_rooms/${id}`);
  rRef.once('value').then(snap => {
    if (!snap.exists()) { alert('Phòng không tồn tại'); return; }
    roomId = id; isHost = false; isSpectator = asSpectator; mySymbol = asSpectator ? null : 'O';
    // write guest name if not spectator
    if (!asSpectator) {
      const guestName = playerNameInput.value.trim() || 'Guest';
      db.ref(`caro_rooms/${roomId}/state/meta/guestName`).set(guestName).catch(()=>{});
      roomMeta.guestName = guestName;
    }
    roomStatus.textContent = `Đã vào phòng ${roomId} ${asSpectator ? '(Spectator)' : '(Bạn là O)'}`;
    setupRoomListeners(roomId, asSpectator);
  });
}

/* send chat to room - everyone (spectator included) can chat */
function sendChatToRoom(msg) {
  if (!firebaseEnabled || !roomId) { appendChatMessage({ name: playerNameInput.value||'You', msg, t: Date.now() }); return; }
  const chatRef = db.ref(`caro_rooms/${roomId}/chat`);
  chatRef.push({ name: playerNameInput.value || 'Guest', msg, t: Date.now() });
}

/* render room header: show share button and names */
function renderRoomHeader() {
  if (!roomStatus) return;
  roomStatus.innerHTML = `Phòng: ${roomId} — Host: ${roomMeta.hostName || '-'} — Guest: ${roomMeta.guestName || '-'}`;
  // create share button if not exists
  if (!document.getElementById('shareRoomBtn')) {
    const btn = document.createElement('button');
    btn.id = 'shareRoomBtn';
    btn.textContent = 'Chia sẻ phòng';
    btn.style.marginLeft = '10px';
    btn.addEventListener('click', ()=> {
      const url = `${location.origin}${location.pathname}?room=${roomId}`;
      navigator.clipboard.writeText(url).then(()=> {
        alert('Link phòng đã copy: ' + url);
      }).catch(()=> { prompt('Copy link phòng:', url); });
    });
    roomStatus.appendChild(btn);
  }
}
/* =========================
   PHẦN 3 — AI Level 2.5 (Threat-based, light & strong)
   ========================= */

/* Utility: clone board */
function cloneBoard(bd) { return bd.map(r => r.slice()); }

/* Candidate cells near stones (radius 2) */
function getCandidateCells(bd, radius = 2) {
  const set = new Set();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (bd[r][c] !== null) {
        for (let dr = -radius; dr <= radius; dr++) {
          for (let dc = -radius; dc <= radius; dc++) {
            const rr = r + dr, cc = c + dc;
            if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && bd[rr][cc] === null) {
              set.add(rr * COLS + cc);
            }
          }
        }
      }
    }
  }
  if (set.size === 0) return [{ r: Math.floor(ROWS/2), c: Math.floor(COLS/2) }];
  return Array.from(set).map(v => ({ r: Math.floor(v / COLS), c: v % COLS }));
}

/* Basic win checker */
function checkWinBoard(bd, r, c, who) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (const d of dirs) {
    let cnt = 1;
    for (let s=1;s<WIN;s++){
      const rr=r+d[0]*s, cc=c+d[1]*s;
      if (rr<0||rr>=ROWS||cc<0||cc>=COLS||bd[rr][cc]!==who) break; cnt++;
    }
    for (let s=1;s<WIN;s++){
      const rr=r-d[0]*s, cc=c-d[1]*s;
      if (rr<0||rr>=ROWS||cc<0||cc>=COLS||bd[rr][cc]!==who) break; cnt++;
    }
    if (cnt>=WIN) return true;
  }
  return false;
}

/* Threat scoring engine: open-4/open-3 detection */
function scoreThreats(bd, r, c, who) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  let score = 0;
  for (const d of dirs) {
    let stones = 1;
    let open = 0;
    for (let s=1; s<WIN; s++) {
      const rr=r+d[0]*s, cc=c+d[1]*s;
      if (rr<0||rr>=ROWS||cc<0||cc>=COLS) break;
      if (bd[rr][cc] === who) stones++;
      else if (bd[rr][cc] === null) { open++; break; }
      else break;
    }
    for (let s=1; s<WIN; s++) {
      const rr=r-d[0]*s, cc=c-d[1]*s;
      if (rr<0||rr>=ROWS||cc<0||cc>=COLS) break;
      if (bd[rr][cc] === who) stones++;
      else if (bd[rr][cc] === null) { open++; break; }
      else break;
    }
    if (stones === 4 && open >= 1) score += 5000;
    else if (stones === 3 && open >= 1) score += 1200;
    else if (stones === 2 && open >= 1) score += 150;
  }
  return score;
}

/* Heuristic for candidate ordering */
function scoreCandidateForOrdering(bd, r, c, ai, opp) {
  let score = 0;
  bd[r][c] = ai;
  score += scoreThreats(bd, r, c, ai);
  bd[r][c] = opp;
  score += scoreThreats(bd, r, c, opp) * 0.8;
  bd[r][c] = null;
  score += 15 - (Math.abs(r-ROWS/2)+Math.abs(c-COLS/2))*0.3;
  return score;
}

/* Fork detection (fast 2-ply) */
function findForkMove(bd, ai, opp, candidates) {
  for (const {r,c} of candidates) {
    if (bd[r][c] !== null) continue;
    const bd1 = cloneBoard(bd);
    bd1[r][c] = ai;
    if (checkWinBoard(bd1,r,c,ai)) return {r,c};
    let forks = 0;
    const oppCandidates = getCandidateCells(bd1,2);
    for (const oc of oppCandidates) {
      if (bd1[oc.r][oc.c] !== null) continue;
      const bd2 = cloneBoard(bd1);
      bd2[oc.r][oc.c] = opp;
      const nextCaps = getCandidateCells(bd2,2);
      for (const nc of nextCaps) {
        if (bd2[nc.r][nc.c] !== null) continue;
        bd2[nc.r][nc.c] = ai;
        if (checkWinBoard(bd2,nc.r,nc.c,ai)) { forks++; bd2[nc.r][nc.c]=null; break; }
        bd2[nc.r][nc.c]=null;
      }
      if (forks >= 2) return {r,c};
    }
  }
  return null;
}

/* Main AI entry (Level 2.5) */
function AI_getMove(bd, aiSymbol) {
  const opp = aiSymbol === 'X' ? 'O' : 'X';
  const candidates = getCandidateCells(bd, 2);

  // immediate win
  for (const {r,c} of candidates) {
    if (bd[r][c]!==null) continue;
    bd[r][c]=aiSymbol;
    if (checkWinBoard(bd,r,c,aiSymbol)) { bd[r][c]=null; return {r,c}; }
    bd[r][c]=null;
  }
  // immediate block
  for (const {r,c} of candidates) {
    if (bd[r][c]!==null) continue;
    bd[r][c]=opp;
    if (checkWinBoard(bd,r,c,opp)) { bd[r][c]=null; return {r,c}; }
    bd[r][c]=null;
  }
  // fork
  const fork = findForkMove(bd, aiSymbol, opp, candidates);
  if (fork) return fork;

  // heuristic scoring / ordering
  let best = null, bestScore = -Infinity;
  for (const {r,c} of candidates) {
    if (bd[r][c]) continue;
    const sc = scoreCandidateForOrdering(bd,r,c,aiSymbol,opp);
    // center bias small
    const cb = 10 - (Math.abs(r-ROWS/2)+Math.abs(c-COLS/2))*0.2;
    const final = sc + cb + Math.random()*0.2; // tiny rand for variety
    if (final > bestScore) { bestScore = final; best = {r,c}; }
  }
  if (!best) return { r: Math.floor(ROWS/2), c: Math.floor(COLS/2) };
  return best;
}

/* ========== End AI Level 2.5 ========= */

/* HISTORY / LEADERBOARD writer (robust) */
function pushGameResult(winnerName, p1, p2, meta = {}) {
  const entry = {
    winner: winnerName || 'Unknown',
    players: { p1: p1 || null, p2: p2 || null },
    meta,
    t: Date.now()
  };
  if (firebaseEnabled) {
    db.ref('leaderboard').push(entry).catch(e => console.warn('LB push fail', e));
    if (roomId) {
      db.ref(`caro_rooms/${roomId}/history`).push({ winner: winnerName, players: {p1,p2}, meta, t: Date.now() }).catch(e => console.warn('hist push fail', e));
    }
  } else {
    const arr = JSON.parse(localStorage.getItem('caro_hist') || '[]');
    arr.push({ time: (new Date()).toLocaleString(), p1, p2, winner: winnerName, meta });
    localStorage.setItem('caro_hist', JSON.stringify(arr));
  }
}
/* =========================
   PHẦN 4 — UI wiring, boot, leaderboard fetch, helpers
   ========================= */

/* ========== Fetch & render global leaderboard (from Firebase) ========== */
function fetchAndRenderGlobalLeaderboard() {
  if (!firebaseEnabled) {
    renderLocalLeaderboard(); // fallback
    return;
  }
  const lbRef = db.ref('leaderboard').limitToLast(5000);
  lbRef.once('value').then(snap => {
    const data = snap.val() || {};
    const items = [];
    Object.values(data).forEach(it => {
      if (!it) return;
      items.push(it);
    });
    // show last 20 entries (sorted by time desc)
    items.sort((a,b)=> (b.t||0) - (a.t||0));
    leaderList.innerHTML = '';
    items.slice(0,20).forEach(i => {
      const li = document.createElement('li');
      const name = i.winner || (i.players && (i.players.p1||i.players.p2)) || 'Unknown';
      li.textContent = `${name} — ${new Date(i.t).toLocaleString()}`;
      leaderList.appendChild(li);
    });
  }).catch(err => {
    console.warn('fetch leaderboard failed', err);
    renderLocalLeaderboard();
  });
}

/* ========== Start / Reset UI handlers ========== */
function startLocalOrAI() {
  makeEmptyBoard();
  renderBoard();
  turn = 'X';
  setTurnLabel(turn);
  playing = true;
  isSpectator = false;
  roomId = null; isHost = false; mySymbol = 'X';
  setStatus(mode === 'ai' ? 'Chơi với Cris (AI) — Bạn là X' : 'Chơi local — X đi trước');
  resetTimer();
  cells.forEach(c => c.classList.remove('win'));
}

function safeAddListener(el, evt, fn) {
  if (!el) return;
  el.addEventListener(evt, fn);
}

/* attach listeners (idempotent usage safe) */
safeAddListener(startBtn, 'click', () => {
  mode = modeSelect.value;
  if (mode === 'online') {
    if (!firebaseEnabled) {
      alert('Firebase chưa cấu hình. Vui lòng thêm config để bật Online.');
      return;
    }
    onlineOptions.style.display = 'block';
    setStatus('Chọn "Tạo phòng" hoặc nhập mã và "Vào phòng"');
  } else {
    onlineOptions.style.display = 'none';
    startLocalOrAI();
  }
});

safeAddListener(resetBtn, 'click', () => {
  makeEmptyBoard();
  updateCells();
  playing = false;
  setStatus('Reset board');
  stopTimer();
  cells.forEach(c => c.classList.remove('win'));
});

safeAddListener(createRoomBtn, 'click', () => {
  if (!firebaseEnabled) { alert('Firebase chưa cấu hình'); return; }
  createRoom();
});

safeAddListener(joinRoomBtn, 'click', () => {
  const id = (roomInput && roomInput.value) ? roomInput.value.trim() : '';
  if (!id) { alert('Nhập mã phòng'); return; }
  joinRoom(id, false);
});

safeAddListener(sendChatBtn, 'click', () => {
  const msg = (chatInput && chatInput.value) ? chatInput.value.trim() : '';
  if (!msg) return;
  // everyone (including spectators) can chat
  if (!firebaseEnabled || !roomId) {
    appendChatMessage({ name: playerNameInput.value || 'You', msg, t: Date.now() });
    chatInput.value = '';
    return;
  }
  sendChatToRoom(msg);
  chatInput.value = '';
});

/* allow Enter key in chat input */
if (chatInput) chatInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendChatBtn.click(); });

/* ========== Monitor connection & boot ========== */
function monitorAndBoot() {
  if (firebaseEnabled) {
    // attach connection monitor
    const connectedRef = db.ref('.info/connected');
    connectedRef.on('value', snap => {
      if (snap.val() === true) {
        console.log('Firebase connected');
        if (roomId) {
          tryReconnectToRoom();
          setupRoomListeners(roomId, isSpectator);
        }
        fetchAndRenderGlobalLeaderboard();
      } else {
        console.log('Firebase disconnected');
        setStatus('Mất kết nối — chờ mạng về');
      }
    });
  }
}

/* initial boot */
function boot() {
  makeEmptyBoard();
  renderBoard();
  renderLocalLeaderboard();
  if (firebaseEnabled) {
    monitorAndBoot();
    fetchAndRenderGlobalLeaderboard();
  } else {
    setStatus('Offline mode (Firebase chưa cấu hình)');
  }

  // auto-join via URL params ?room=xxx&mode=spectate
  const params = new URLSearchParams(window.location.search);
  const r = params.get('room');
  const m = params.get('mode');
  if (r) {
    if (m === 'spectate') joinRoom(r, true);
    else joinRoom(r, false);
  }
}

/* start up */
boot();

/* ========== Timer ========== */
function resetTimer() {
  stopTimer();
  timerRemaining = TURN_TIMEOUT;
  timerLabel.textContent = `${timerRemaining}s`;
  timerInterval = setInterval(() => {
    timerRemaining--;
    timerLabel.textContent = `${timerRemaining}s`;
    if (timerRemaining <= 0) {
      clearInterval(timerInterval);
      onTimeExpired();
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerLabel.textContent = '0s';
}

/* ========== Small utilities ========== */
/* handle timer expiry */
function onTimeExpired() {
  if (!playing) return;
  const loser = turn;
  const winner = (turn === 'X') ? 'O' : 'X';
  const winnerName = (winner === 'X') ? getNameForSymbol('X') : getNameForSymbol('O');
  setStatus(`Hết giờ! ${winnerName} thắng`);
  playing = false;
  stopTimer();
  saveLocalResult(getNameForSymbol('X'), getNameForSymbol('O'), winnerName, { reason: 'timeout' });
  pushGameResult(winnerName, getNameForSymbol('X'), getNameForSymbol('O'), { reason: 'timeout', room: roomId || 'local' });
  if (firebaseEnabled && mode === 'online' && roomId) {
    const histRef = db.ref(`caro_rooms/${roomId}/history`);
    histRef.push({ t: Date.now(), winner: winnerName, reason: 'timeout' });
  }
}

/* debug helper: print board to console */
function debugPrintBoard() {
  console.log(board.map(r => r.map(c => c || '.').join(' ')).join('\n'));
}

/* ========== End of game.js ========= */
