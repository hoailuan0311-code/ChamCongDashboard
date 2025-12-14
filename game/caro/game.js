/***********************************************************
 * game.js — FULL VERSION (Cris Studio Caro Online + AI)
 * PART 1 — INIT, STATE, RENDER, HELPERS
 ***********************************************************/

/* ========== CONFIG ========== */

const COLS = 40, ROWS = 30, WIN = 5;
const TURN_TIMEOUT = 60;

/* ========== FIREBASE CONFIG (CRIS) ========== */
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

/* store player names */
let roomMeta = { hostName: null, guestName: null };

/* inject CSS */
(function injectStyles(){
  const s = document.createElement('style');
  s.textContent = `
    .cell.last-move {
      outline: 3px solid #00d9ff;
      animation: lastMovePulse 0.5s ease-out;
    }
    @keyframes lastMovePulse {
      from { outline-color: #ffffff; }
      to   { outline-color: #00d9ff; }
    }
    .cell.x { color:#00ff7f;font-weight:700;text-align:center; }
    .cell.o { color:#ff6b6b;font-weight:700;text-align:center; }
    #gameArea { display:grid;gap:2px; }
    .cell {
      background:rgba(255,255,255,0.05);
      display:flex;align-items:center;justify-content:center;
      font-size:18px;border-radius:2px;
      transition: transform 0.15s ease-out;
    }
    .cell.play-anim { transform: scale(1.25); }
    .win { box-shadow:0 0 12px 3px rgba(255,215,0,0.9)!important; }
  `;
  document.head.appendChild(s);
})();

/* Firebase init */
function initFirebase() {
  try {
    const app = firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    firebaseEnabled = true;
  } catch (e) {
    console.warn("Firebase init failed", e);
    firebaseEnabled = false;
  }
}
initFirebase();

/* BOARD HELPERS */
function makeEmptyBoard() {
  board = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => null)
  );
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

/* RENDER BOARD */
function renderBoard() {
  gameArea.innerHTML = "";
  cells = [];
  gameArea.style.gridTemplateColumns = `repeat(${COLS},1fr)`;
  gameArea.style.gridTemplateRows = `repeat(${ROWS},1fr)`;

  for (let r=0; r<ROWS; r++) {
    for (let c=0; c<COLS; c++) {
      const el = document.createElement('div');
      el.className = "cell";
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
      const v = board[r][c];
      el.className = "cell";
      el.textContent = "";
      if (v === "X") { el.classList.add("x"); el.textContent="X"; }
      if (v === "O") { el.classList.add("o"); el.textContent="O"; }
    }
  }
}

function cellBy(r,c) {
  return cells[r * COLS + c];
}

function highlightLastMove(r,c) {
  cells.forEach(el => el.classList.remove("last-move"));
  const el = cellBy(r,c);
  if (el) {
    el.classList.add("last-move");
    el.classList.add("play-anim");
    setTimeout(()=> el.classList.remove("play-anim"), 200);
  }
}

/* PLAYER NAME HANDLING */
function isAIMode() {
  return mode === 'ai' || mode === 'cris';
}

function getNameForSymbol(sym) {
  if (mode === 'online') {
    if (sym === 'X') return roomMeta.hostName || "Host";
    if (sym === 'O') return roomMeta.guestName || "Guest";
  }
  if (isAIMode()) {
    return sym === 'X'
      ? (playerNameInput.value.trim() || "Bạn")
      : "Cris (AI)";
  }
  return sym;
}

function setTurnLabel(val) {
  if (val === 'X' || val === 'O')
    turnLabel.textContent = `Lượt hiện tại: ${getNameForSymbol(val)}`;
  else
    turnLabel.textContent = `Lượt hiện tại: ${val}`;
}

function setStatus(s) {
  statusLabel.textContent = `Trạng thái: ${s}`;
}

/***********************************************************
 * HẾT PHẦN 1 — COPY NGUYÊN VÀ GIỮ NGUYÊN
 ***********************************************************/
/***********************************************************
 * PART 2 — MOVE HANDLING, ONLINE MODE, CHAT, ROOM SHARE
 ***********************************************************/

/* ========== BASIC BOARD UTIL ========== */
function boardIsFull() {
  for (let r=0; r<ROWS; r++)
    for (let c=0; c<COLS; c++)
      if (!board[r][c]) return false;
  return true;
}

/* ========== HANDLE CLICK ON CELL ========== */
function onCellClick(e) {
  if (!playing) return;
  if (isSpectator) return;

  const r = parseInt(e.currentTarget.dataset.r);
  const c = parseInt(e.currentTarget.dataset.c);
  if (board[r][c]) return;

  /* ---- ONLINE MODE ---- */
  if (mode === 'online') {
    if (!firebaseEnabled) return alert("Firebase chưa bật");
    if (turn !== mySymbol) return;
    makeAndPushMove(r, c, mySymbol);
    return;
  }

  /* ---- LOCAL / AI MODE ---- */
  makeAndApplyMove(r,c,turn);
  highlightLastMove(r,c);

  const line = checkWinWithLine(r,c,turn);
  if (line) {
    highlightWin(line);
    playing = false;
    setStatus(`${getNameForSymbol(turn)} thắng!`);
    saveLocalResult(getNameForSymbol('X'),getNameForSymbol('O'),getNameForSymbol(turn));
    pushGameResult(getNameForSymbol(turn), getNameForSymbol('X'), getNameForSymbol('O'));
    stopTimer();
    return;
  }

  if (boardIsFull()) {
    playing = false;
    setStatus(`Hòa!`);
    saveLocalResult(getNameForSymbol('X'),getNameForSymbol('O'),'Hòa');
    pushGameResult('Hòa',getNameForSymbol('X'),getNameForSymbol('O'));
    stopTimer();
    return;
  }

  turn = (turn === 'X') ? 'O' : 'X';
  setTurnLabel(turn);
  resetTimer();

  /* ---- AI TURN ---- */
  if (isAIMode() && turn === 'O' && playing) {
    setStatus("Cris đang suy nghĩ...");
    setTimeout(() => {
      const mv = AI_getMove(board, 'O');
      if (!mv) {
        playing = false;
        setStatus(`Hòa!`);
        saveLocalResult(getNameForSymbol('X'),getNameForSymbol('O'),'Hòa');
        pushGameResult('Hòa',getNameForSymbol('X'),getNameForSymbol('O'));
        stopTimer();
        return;
      }
      makeAndApplyMove(mv.r,mv.c,'O');
      highlightLastMove(mv.r,mv.c);

      const win2 = checkWinWithLine(mv.r,mv.c,'O');
      if (win2) {
        highlightWin(win2);
        playing = false;
        setStatus(`Cris (AI) thắng!`);
        saveLocalResult(getNameForSymbol('X'),getNameForSymbol('O'),'Cris (AI)');
        pushGameResult('Cris (AI)',getNameForSymbol('X'),getNameForSymbol('O'),{type:'ai'});
        stopTimer();
        return;
      }

      turn = 'X';
      setTurnLabel(turn);
      setStatus("Lượt bạn");
      resetTimer();
    }, 180);
  }
}

/* APPLY MOVE (LOCAL) */
function makeAndApplyMove(r,c,who) {
  board[r][c] = who;
  updateCells();
}

/* ========== ONLINE: PUSH MOVE TO FIREBASE ========== */
function makeAndPushMove(r,c,who) {
  if (!roomId) return;

  const movesRef = db.ref(`caro_rooms/${roomId}/moves`);
  movesRef.push({
    r, c, who, t: Date.now()
  }, err => {
    if (err) return console.warn("Push move failed", err);

    board[r][c] = who;
    updateCells();
    highlightLastMove(r,c);

    const stateRef = db.ref(`caro_rooms/${roomId}/state`);
    stateRef.set({
      board: flatBoard(),
      turn: (who==='X'?'O':'X'),
      lastMove: {r,c,who,t:Date.now()},
      meta: roomMeta
    });

    const line = checkWinWithLine(r,c,who);
    if (line) {
      highlightWin(line);
      playing = false;
      const winnerName = getNameForSymbol(who);
      setStatus(`${winnerName} thắng!`);
      saveLocalResult(getNameForSymbol('X'),getNameForSymbol('O'),winnerName);
      pushGameResult(winnerName,getNameForSymbol('X'),getNameForSymbol('O'),{room:roomId});
      db.ref(`caro_rooms/${roomId}/history`).push({
        winner: winnerName,
        t: Date.now()
      });
      stopTimer();
    } else {
      turn = (who==='X'?'O':'X');
      setTurnLabel(turn);
      resetTimer();
    }
  });
}

/* ========== ONLINE: ROOM LISTENERS ========== */
function setupRoomListeners(rid, spectator=false) {
  roomId = rid;
  isSpectator = spectator;

  roomMovesRef = db.ref(`caro_rooms/${rid}/moves`);
  roomStateRef = db.ref(`caro_rooms/${rid}/state`);
  roomChatRef  = db.ref(`caro_rooms/${rid}/chat`);
  const histRef = db.ref(`caro_rooms/${rid}/history`);

  /* LOAD INITIAL STATE */
  roomStateRef.once('value').then(snap=>{
    const st = snap.val();
    if (st && st.board) {
      loadBoardFromFlat(st.board);
      updateCells();
      if (st.turn) { turn = st.turn; setTurnLabel(turn); }
      if (st.meta) roomMeta = st.meta;
      if (st.lastMove) {
        highlightLastMove(st.lastMove.r, st.lastMove.c);
      }
    } else {
      roomStateRef.set({ board: flatBoard(), turn:'X', lastMove: null, meta: roomMeta });
    }
  });

  /* LISTEN: MOVES STREAM */
  roomMovesRef.on('child_added', snap=>{
    const mv = snap.val();
    if (!mv) return;
    if (board[mv.r][mv.c]) return;

    board[mv.r][mv.c] = mv.who;
    updateCells();
    highlightLastMove(mv.r,mv.c);

    const line = checkWinWithLine(mv.r,mv.c,mv.who);
    if (line) {
      highlightWin(line);
      playing = false;
      const w = getNameForSymbol(mv.who);
      setStatus(`${w} thắng!`);
      saveLocalResult(getNameForSymbol('X'),getNameForSymbol('O'),w);
      pushGameResult(w,getNameForSymbol('X'),getNameForSymbol('O'),{room:rid});
      stopTimer();
    } else {
      turn = mv.who==='X' ? 'O':'X';
      setTurnLabel(turn);
      resetTimer();
    }
  });

  /* LISTEN: CHAT */
  roomChatRef.limitToLast(300).on('child_added', snap=>{
    if (snap.exists()) appendChatMessage(snap.val());
  });

  /* LISTEN: HISTORY */
  histRef.limitToLast(10).on('child_added', snap=>{
    const it = snap.val();
    if (!it) return;
    roomStatus.textContent = `Phòng ${rid} — Thắng gần nhất: ${it.winner}`;
  });

  renderRoomHeader();
  playing = true;
  setStatus("Đã vào phòng — chờ lượt");
  resetTimer();
}

/* CREATE ROOM */
function createRoom() {
  const id = Math.random().toString(36).slice(2,9);
  roomId = id;
  isHost = true;
  mySymbol = 'X';
  isSpectator = false;

  roomMeta.hostName = playerNameInput.value.trim() || "Host";
  roomMeta.guestName = null;

  const ref = db.ref(`caro_rooms/${id}`);
  ref.set({
    createdAt: Date.now(),
    hostName: roomMeta.hostName,
    state: { board: flatBoard(), turn:'X', lastMove:null, meta:roomMeta }
  }, err=>{
    if (err) return alert("Không tạo được phòng");
    roomStatus.textContent = `Phòng ${id} — Bạn là X`;
    setupRoomListeners(id,false);
  });
}

/* JOIN ROOM */
function joinRoom(id, spectator=false) {
  if (!id) return alert("Nhập mã phòng");

  db.ref(`caro_rooms/${id}`).once('value').then(snap=>{
    if (!snap.exists()) return alert("Phòng không tồn tại");

    roomId = id;
    isHost = false;
    isSpectator = spectator;
    mySymbol = spectator ? null : 'O';

    if (!spectator) {
      const guest = playerNameInput.value.trim() || "Guest";
      db.ref(`caro_rooms/${id}/state/meta/guestName`).set(guest);
      roomMeta.guestName = guest;
    }

    roomStatus.textContent = `Đã vào phòng ${id} ${spectator?"(Theo dõi)": "(Bạn là O)"}`;
    setupRoomListeners(id, spectator);
  });
}

/* SEND CHAT */
function sendChatToRoom(msg) {
  if (!roomId) {
    appendChatMessage({name:"You", msg, t:Date.now()});
    return;
  }
  roomChatRef.push({ name: playerNameInput.value || "User", msg, t: Date.now() });
}

/* SHOW ROOM HEADER + SHARE BUTTON */
function renderRoomHeader() {
  roomStatus.innerHTML =
    `Phòng: ${roomId} — Host: ${roomMeta.hostName||'-'} — Guest: ${roomMeta.guestName||'-'}`;

  if (!document.getElementById("shareRoomBtn")) {
    const btn = document.createElement("button");
    btn.id = "shareRoomBtn";
    btn.textContent = "Chia sẻ phòng";
    btn.style.marginLeft = "10px";
    btn.onclick = ()=>{
      const url = `${location.origin}${location.pathname}?room=${roomId}`;
      navigator.clipboard.writeText(url).then(()=>{
        alert("Đã copy link phòng:\n" + url);
      });
    };
    roomStatus.appendChild(btn);
  }
}

/***********************************************************
 * HẾT PHẦN 2 — COPY NGUYÊN & GIỮ NGUYÊN
 ***********************************************************/
/***********************************************************
 * PART 3 — WIN CHECK + HIGHLIGHT + AI (OPTIMIZED)
 ***********************************************************/

/* ========== WIN DETECTION (return line of winning cells) ========== */
function checkWinWithLine(r, c, who) {
  const dirs = [
    [0,1],  // horizontal
    [1,0],  // vertical
    [1,1],  // diag down
    [1,-1]  // diag up
  ];

  for (const [dr, dc] of dirs) {
    const line = [{ r, c }];

    // forward
    for (let k = 1; k < WIN; k++) {
      const rr = r + dr * k, cc = c + dc * k;
      if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) break;
      if (board[rr][cc] === who) line.push({ r: rr, c: cc });
      else break;
    }

    // backward
    for (let k = 1; k < WIN; k++) {
      const rr = r - dr * k, cc = c - dc * k;
      if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) break;
      if (board[rr][cc] === who) line.push({ r: rr, c: cc });
      else break;
    }

    if (line.length >= WIN) return line;
  }
  return null;
}

/* ========== Highlight WIN (visual) ========== */
function highlightWin(line) {
  if (!line || !Array.isArray(line)) return;
  // add class to each winning cell
  line.forEach(p => {
    const el = cellBy(p.r, p.c);
    if (el) el.classList.add('win');
  });

  // small flash animation (toggle class quickly)
  setTimeout(() => {
    line.forEach(p => {
      const el = cellBy(p.r, p.c);
      if (el) el.classList.add('play-anim');
    });
  }, 50);
  setTimeout(() => {
    line.forEach(p => {
      const el = cellBy(p.r, p.c);
      if (el) el.classList.remove('play-anim');
    });
  }, 500);
}

/* ========== AI (Optimized Level 2.8) ========== */

/* clone board helper */
function cloneBoard(bd) {
  return bd.map(r => r.slice());
}

/* get candidate empty cells near existing stones (radius default 2) */
function getCandidateCells(bd, radius = 2, maxCandidates = 200) {
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
  // if no stones yet, play center
  if (set.size === 0) return [{ r: Math.floor(ROWS/2), c: Math.floor(COLS/2) }];

  const arr = Array.from(set).map(v => ({ r: Math.floor(v / COLS), c: v % COLS }));
  // If too many candidates, trim by simple proximity to center (fast)
  if (arr.length > maxCandidates) {
    arr.sort((a,b) => {
      const da = Math.abs(a.r-ROWS/2)+Math.abs(a.c-COLS/2);
      const db = Math.abs(b.r-ROWS/2)+Math.abs(b.c-COLS/2);
      return da - db;
    });
    return arr.slice(0, maxCandidates);
  }
  return arr;
}

/* quick board win check for AI use (uses checkWinBoard) */
function checkWinBoard(bd, r, c, who) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (const d of dirs) {
    let cnt = 1;
    for (let s=1; s<WIN; s++) {
      const rr = r + d[0]*s, cc = c + d[1]*s;
      if (rr<0||rr>=ROWS||cc<0||cc>=COLS||bd[rr][cc]!==who) break;
      cnt++;
    }
    for (let s=1; s<WIN; s++) {
      const rr = r - d[0]*s, cc = c - d[1]*s;
      if (rr<0||rr>=ROWS||cc<0||cc>=COLS||bd[rr][cc]!==who) break;
      cnt++;
    }
    if (cnt>=WIN) return true;
  }
  return false;
}

/* threat scoring — counts near-run lengths with open ends */
function scoreThreats(bd, r, c, who) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  let score = 0;
  for (const d of dirs) {
    let stones = 1;
    let open = 0;
    // forward
    for (let s=1; s<WIN; s++) {
      const rr = r + d[0]*s, cc = c + d[1]*s;
      if (rr<0||rr>=ROWS||cc<0||cc>=COLS) break;
      if (bd[rr][cc] === who) stones++;
      else if (bd[rr][cc] === null) { open++; break; }
      else break;
    }
    // backward
    for (let s=1; s<WIN; s++) {
      const rr = r - d[0]*s, cc = c - d[1]*s;
      if (rr<0||rr>=ROWS||cc<0||cc>=COLS) break;
      if (bd[rr][cc] === who) stones++;
      else if (bd[rr][cc] === null) { open++; break; }
      else break;
    }

    if (stones === 4 && open >= 1) score += 5000;
    else if (stones === 3 && open >= 1) score += 1200;
    else if (stones === 2 && open >= 1) score += 200;
  }
  return score;
}

/* order candidate by fast heuristic (cheap) */
function scoreCandidateFast(bd, r, c, ai, opp) {
  let sc = 0;
  // center bias
  sc += 50 - (Math.abs(r-ROWS/2)+Math.abs(c-COLS/2));
  // local adjacency count
  let adj = 0;
  for (let dr=-1; dr<=1; dr++) for (let dc=-1; dc<=1; dc++) {
    if (dr===0 && dc===0) continue;
    const rr = r+dr, cc = c+dc;
    if (rr>=0 && rr<ROWS && cc>=0 && cc<COLS && bd[rr][cc] !== null) adj++;
  }
  sc += adj*10;
  return sc;
}

/* detect fork (simple 2-ply check) */
function findForkMove(bd, ai, opp, candidates) {
  for (const {r,c} of candidates) {
    if (bd[r][c] !== null) continue;
    const bd1 = cloneBoard(bd);
    bd1[r][c] = ai;
    if (checkWinBoard(bd1, r, c, ai)) return {r,c};
    let winCount = 0;
    // count distinct winning moves in next ply
    const nextCands = getCandidateCells(bd1,2,100);
    for (const nc of nextCands) {
      if (bd1[nc.r][nc.c]) continue;
      const bd2 = cloneBoard(bd1);
      bd2[nc.r][nc.c] = ai;
      if (checkWinBoard(bd2, nc.r, nc.c, ai)) {
        winCount++;
        if (winCount >= 2) return {r,c};
      }
    }
  }
  return null;
}

/* main AI: optimized flow with candidate pruning */
function AI_getMove(bd, aiSymbol) {
  const opp = aiSymbol === 'X' ? 'O' : 'X';
  // gather candidates near stones
  let candidates = getCandidateCells(bd, 2, 400);

  // 1) immediate win
  for (const {r,c} of candidates) {
    if (bd[r][c]) continue;
    bd[r][c] = aiSymbol;
    if (checkWinBoard(bd, r, c, aiSymbol)) { bd[r][c] = null; return {r,c}; }
    bd[r][c] = null;
  }

  // 2) immediate block
  for (const {r,c} of candidates) {
    if (bd[r][c]) continue;
    bd[r][c] = opp;
    if (checkWinBoard(bd, r, c, opp)) { bd[r][c] = null; return {r,c}; }
    bd[r][c] = null;
  }

  // 3) fork creation
  const fork = findForkMove(bd, aiSymbol, opp, candidates);
  if (fork) return fork;

  // 4) prune candidates by fast heuristic to top N
  const scored = candidates.map(p => {
    const scFast = scoreCandidateFast(bd, p.r, p.c, aiSymbol, opp);
    return { p, scFast };
  }).sort((a,b) => b.scFast - a.scFast);

  const top = scored.slice(0, Math.min(60, scored.length)).map(x => x.p);

  // 5) deeper heuristic scoring (threat-based)
  let best = null, bestScore = -Infinity;
  for (const {r,c} of top) {
    if (bd[r][c]) continue;
    let sc = 0;
    sc += scoreThreats(bd, r, c, aiSymbol);      // own threats
    sc += scoreThreats(bd, r, c, opp) * 0.85;    // block opponent threats weighted
    // proximity bias
    sc += 20 - (Math.abs(r-ROWS/2)+Math.abs(c-COLS/2))*0.2;
    // small random to diversify moves
    sc += Math.random() * 0.3;
    if (sc > bestScore) { bestScore = sc; best = {r,c}; }
  }

  if (!best) {
    // fallback to center
    return { r: Math.floor(ROWS/2), c: Math.floor(COLS/2) };
  }
  return best;
}

/***********************************************************
 * HẾT PHẦN 3 — COPY NGUYÊN & GIỮ NGUYÊN
 ***********************************************************/
/***********************************************************
 * PART 4 — LEADERBOARD, BOOT, UI WIRING, TIMER, UTILITIES
 ***********************************************************/

/* ========== Local leaderboard + push writer (robust) ========== */
function pushGameResult(winnerName, p1, p2, meta = {}) {
  const entry = {
    winner: winnerName || 'Unknown',
    players: { p1: p1 || null, p2: p2 || null },
    meta: meta || {},
    t: Date.now()
  };

  // write to Firebase if enabled
  if (firebaseEnabled && db) {
    try {
      db.ref('leaderboard').push(entry).catch(e => console.warn('LB push fail', e));
      if (roomId) {
        db.ref(`caro_rooms/${roomId}/history`).push({ winner: winnerName, players: { p1, p2 }, meta, t: Date.now() }).catch(e => console.warn('hist push fail', e));
      }
    } catch (e) {
      console.warn('pushGameResult error', e);
    }
  } else {
    // fallback to localStorage
    const arr = JSON.parse(localStorage.getItem('caro_hist') || '[]');
    arr.push({ time: new Date().toLocaleString(), p1, p2, winner: winnerName, meta });
    localStorage.setItem('caro_hist', JSON.stringify(arr));
  }

  // update visible leaderboard immediately
  fetchAndRenderGlobalLeaderboard();
}

/* ========== Local leaderboard render (fallback) ========== */
function renderLocalLeaderboard() {
  const arr = JSON.parse(localStorage.getItem('caro_hist') || '[]');
  leaderList.innerHTML = '';
  arr.slice(-20).reverse().forEach(it => {
    const li = document.createElement('li');
    const winner = it.winner || 'Unknown';
    const p1 = it.p1 || '-';
    const p2 = it.p2 || '-';
    const reason = (it.meta && it.meta.reason) ? ` (${it.meta.reason})` : '';
    li.textContent = `${winner} ⇄ ${p1} vs ${p2} — ${it.time}${reason}`;
    leaderList.appendChild(li);
  });
}

/* ========== Append chat message helper (used by listeners) ========== */
function appendChatMessage(obj) {
  if (!chatMessages) return;
  const div = document.createElement('div');
  const who = obj.name || 'User';
  const when = new Date(obj.t || Date.now()).toLocaleTimeString();
  const text = obj.msg || '';
  div.textContent = `${when} • ${who}: ${text}`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/* ========== save local result (fallback) ========== */
function saveLocalResult(p1, p2, winner, meta = {}) {
  const arr = JSON.parse(localStorage.getItem('caro_hist') || '[]');
  arr.push({
    time: new Date().toLocaleString(),
    p1, p2, winner, meta
  });
  localStorage.setItem('caro_hist', JSON.stringify(arr));
}

/* ========== tryReconnectToRoom (best-effort) ========== */
function tryReconnectToRoom() {
  if (!firebaseEnabled || !roomId || !db) return;
  db.ref(`caro_rooms/${roomId}/state`).once('value').then(snap => {
    const st = snap.val();
    if (!st) return;
    if (st.board && st.board.length === ROWS * COLS) {
      loadBoardFromFlat(st.board);
      updateCells();
    }
    if (st.lastMove) highlightLastMove(st.lastMove.r, st.lastMove.c);
    if (st.turn) { turn = st.turn; setTurnLabel(turn); }
    if (st.meta) roomMeta = st.meta;
    setStatus('Đã reconnect vào phòng');
    playing = true;
    resetTimer();
  }).catch(e => console.warn('reconnect fail', e));
}

/* ========== Fetch & render global leaderboard (Firebase) ========== */
function fetchAndRenderGlobalLeaderboard() {
  if (!firebaseEnabled || !db) {
    renderLocalLeaderboard();
    return;
  }
  const lbRef = db.ref('leaderboard').limitToLast(200);
  lbRef.once('value').then(snap => {
    const data = snap.val() || {};
    const items = Object.values(data).filter(Boolean);
    items.sort((a,b) => (b.t || 0) - (a.t || 0));
    leaderList.innerHTML = '';
    items.slice(0,20).forEach(i => {
      const li = document.createElement('li');
      const winner = i.winner || 'Unknown';
      const p1 = (i.players && i.players.p1) || '-';
      const p2 = (i.players && i.players.p2) || '-';
      const reason = (i.meta && i.meta.reason) ? ` (${i.meta.reason})` : '';
      li.textContent = `${winner} ⇄ ${p1} vs ${p2} — ${new Date(i.t).toLocaleString()}${reason}`;
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
  setStatus(isAIMode() ? 'Chơi với Cris (AI) — Bạn là X' : 'Chơi local — X đi trước');
  resetTimer();
  // remove win classes
  cells.forEach(c => c.classList.remove('win'));
}

/* attach safe listener */
function safeAddListener(el, evt, fn) {
  if (!el) return;
  el.removeEventListener(evt, fn); // try to avoid duplicate (idempotent)
  el.addEventListener(evt, fn);
}

/* ========== UI Buttons wiring ========== */
safeAddListener(startBtn, 'click', () => {
  mode = (modeSelect && modeSelect.value) ? modeSelect.value : 'ai';
  if (mode === 'online') {
    if (!firebaseEnabled) {
      alert('Firebase chưa cấu hình. Vui lòng bật cấu hình.');
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
  if (!firebaseEnabled) return alert('Firebase chưa cấu hình');
  createRoom();
});

safeAddListener(joinRoomBtn, 'click', () => {
  const id = (roomInput && roomInput.value) ? roomInput.value.trim() : '';
  if (!id) return alert('Nhập mã phòng');
  joinRoom(id, false);
});

safeAddListener(sendChatBtn, 'click', () => {
  const msg = (chatInput && chatInput.value) ? chatInput.value.trim() : '';
  if (!msg) return;
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
  if (!firebaseEnabled || !db) return;
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

/* ========== Boot sequence ========== */
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

/* ========== TIMER ========== */
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
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  timerLabel.textContent = '0s';
}

/* ========== Timer expiry handler ========== */
function onTimeExpired() {
  if (!playing) return;
  const loser = turn;
  const winner = (turn === 'X') ? 'O' : 'X';
  const winnerName = getNameForSymbol(winner);
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

/* ========== Debug helper ========== */
function debugPrintBoard() {
  console.log(board.map(r => r.map(c => c || '.').join(' ')).join('\n'));
}

/***********************************************************
 * HẾT PART 4 — COPY NGUYÊN VÀ GHÉP 1→2→3→4 (theo thứ tự)
 ***********************************************************/
