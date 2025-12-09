/***********************************************************
 * game.js — Caro (Gomoku) Full with Firebase & new AI
 ***********************************************************/

/* ========== CONFIG ========== */

const COLS = 30, ROWS = 20, WIN = 5;
const TURN_TIMEOUT = 30;

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

/* ========== Win Detection ========== */
function checkWinWithLine(r, c, who, bd = board) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];

  for (const d of dirs) {
    let line = [{r,c}];

    for (let s=1; s<WIN; s++) {
      const rr = r + d[0]*s, cc = c + d[1]*s;
      if (rr<0||rr>=ROWS||cc<0||cc>=COLS || bd[rr][cc] !== who) break;
      line.push({r:rr,c:cc});
    }
    for (let s=1; s<WIN; s++) {
      const rr = r - d[0]*s, cc = c - d[1]*s;
      if (rr<0||rr>=ROWS||cc<0||cc>=COLS || bd[rr][cc] !== who) break;
      line.push({r:rr,c:cc});
    }

    if (line.length >= WIN) return line;
  }
  return null;
}

function highlightWin(line) {
  cells.forEach(c => c.classList.remove("win"));
  if (!line) return;
  for (const p of line) {
    cellBy(p.r,p.c).classList.add("win");
  }
}

/* ========== Timer ========== */
function resetTimer() {
  stopTimer();
  timerRemaining = TURN_TIMEOUT;
  timerLabel.textContent = timerRemaining;
  timerInterval = setInterval(() => {
    timerRemaining--;
    timerLabel.textContent = timerRemaining;
    if (timerRemaining <= 0) {
      clearInterval(timerInterval);
      onTimeExpired();
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

/* ========== UI ========== */
function setStatus(s) { statusLabel.textContent = s; }
function setTurnLabel(s) { turnLabel.textContent = s; }

/* ========== Local History ========== */
function saveLocalResult(p1,p2,winnerName,meta={}) {
  const arr = JSON.parse(localStorage.getItem("caro_hist")||"[]");
  arr.push({
    time: new Date().toLocaleString(),
    p1, p2,
    winner: winnerName,
    meta
  });
  localStorage.setItem("caro_hist", JSON.stringify(arr));
}

/* =========================
   PHẦN 2 — AI, Move logic, Online helpers
   ========================= */

/* ========== Board utilities ========== */
function boardIsFull() {
  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) if (!board[r][c]) return false;
  return true;
}

/* ========== Move handlers (UI click) ========== */
function onCellClick(e) {
  if (!playing) return;
  if (isSpectator) return;
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

  // check win
  const line = checkWinWithLine(r,c,turn);
  if (line) {
    highlightWin(line);
    playing = false;
    setStatus(`${turn} thắng!`);
    saveLocalResult(getNameForSymbol('X'), getNameForSymbol('O'), getNameForSymbol(turn), {type:'local'});
    pushLeaderboardEntry({ winner: getNameForSymbol(turn), reason:'win', room:'local' });
    stopTimer();
    return;
  }

  if (boardIsFull()) {
    playing = false;
    setStatus('Hòa!');
    saveLocalResult(getNameForSymbol('X'), getNameForSymbol('O'),'Hòa',{type:'local'});
    pushLeaderboardEntry({ winner: 'Hòa', reason:'draw', room:'local' });
    stopTimer();
    return;
  }

  // toggle turn
  turn = (turn === 'X') ? 'O' : 'X';
  setTurnLabel(turn);
  resetTimer();

  // AI turn
  if (mode === 'ai' && playing && turn === 'O') {
    setStatus('Cris đang suy nghĩ...');
    setTimeout(()=> {
      const mv = AI_getMove(board, 'O');
      if (!mv) { playing=false; setStatus('Hòa!'); saveLocalResult(getNameForSymbol('X'), getNameForSymbol('O'),'Hòa'); stopTimer(); return; }
      makeAndApplyMove(mv.r,mv.c,'O');
      const line2 = checkWinWithLine(mv.r,mv.c,'O');
      if (line2) {
        highlightWin(line2);
        playing = false;
        setStatus('Cris (O) thắng!');
        saveLocalResult(getNameForSymbol('X'), getNameForSymbol('O'),'Cris (AI)');
        pushLeaderboardEntry({ winner: 'Cris (AI)', reason:'win', room:'local' });
        stopTimer();
        return;
      }
      // back to player
      turn = 'X'; setTurnLabel(turn);
      setStatus('Lượt bạn');
      resetTimer();
    }, 260);
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
    // update snapshot state
    const stateRef = db.ref(`caro_rooms/${roomId}/state`);
    // apply locally immediately for snappy UI
    board[r][c] = who; updateCells();
    stateRef.set({ board: flatBoard(), turn: (who==='X'?'O':'X'), lastMove: {r,c,who,t:Date.now()} });

    // check win
    const line = checkWinWithLine(r,c,who);
    if (line) {
      highlightWin(line);
      playing = false;
      setStatus(`${who} thắng!`);
      const winnerName = (who === mySymbol) ? (playerNameInput.value.trim() || 'You') : 'Opponent';
      saveLocalResult(getNameForSymbol('X'), getNameForSymbol('O'), winnerName);
      pushLeaderboardEntry({ winner: winnerName, reason:'win', room: roomId });
      // push room history
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

  // load existing state or init
  roomStateRef.once('value').then(snap => {
    const st = snap.val();
    if (st && st.board && st.board.length === ROWS*COLS) {
      loadBoardFromFlat(st.board); updateCells();
      if (st.turn) { turn = st.turn; setTurnLabel(turn); }
    } else {
      roomStateRef.set({ board: flatBoard(), turn: 'X', lastMove: null });
    }
  });

  // moves stream
  roomMovesRef.on('child_added', snap => {
    const mv = snap.val();
    if (!mv) return;
    // skip if already played locally
    if (board[mv.r][mv.c]) return;
    board[mv.r][mv.c] = mv.who; updateCells();
    const line = checkWinWithLine(mv.r,mv.c,mv.who);
    if (line) {
      highlightWin(line);
      playing = false;
      setStatus(`${mv.who} thắng!`);
      saveLocalResult(getNameForSymbol('X'), getNameForSymbol('O'), (mv.who === mySymbol ? (playerNameInput.value.trim()||'You') : 'Opponent'));
      stopTimer();
    } else {
      turn = mv.who === 'X' ? 'O' : 'X';
      setTurnLabel(turn);
      resetTimer();
    }
  });

  // chat
  roomChatRef.limitToLast(200).on('child_added', snap => {
    if (snap.exists()) appendChatMessage(snap.val());
  });

  // history
  histRef.limitToLast(10).on('child_added', snap => {
    const it = snap.val();
    if (!it) return;
    roomStatus.textContent = `Phòng ${roomId} — Gần nhất: ${it.winner || '-'}`;
  });

  playing = true;
  setStatus('Kết nối phòng — chờ lượt');
  resetTimer();
}

/* create/join room */
function createRoom() {
  if (!firebaseEnabled) { alert('Firebase chưa cấu hình'); return; }
  const id = Math.random().toString(36).slice(2,9);
  roomId = id; isHost = true; mySymbol = 'X'; isSpectator = false;
  const rRef = db.ref(`caro_rooms/${roomId}`);
  rRef.set({ createdAt: Date.now(), hostName: playerNameInput.value.trim()||'Host', state: { board: flatBoard(), turn: 'X', lastMove: null }}, err=>{
    if (err) { alert('Tạo phòng lỗi'); console.warn(err); }
    else { roomStatus.textContent = `Phòng: ${roomId} (Bạn là chủ phòng - X)`; setupRoomListeners(roomId,false); }
  });
}

function joinRoom(id, asSpectator=false) {
  if (!firebaseEnabled) { alert('Firebase chưa cấu hình'); return; }
  if (!id) { alert('Nhập mã phòng'); return; }
  const rRef = db.ref(`caro_rooms/${id}`);
  rRef.once('value').then(snap => {
    if (!snap.exists()) { alert('Phòng không tồn tại'); return; }
    roomId = id; isHost = false; isSpectator = asSpectator; mySymbol = asSpectator ? null : 'O';
    roomStatus.textContent = `Đã vào phòng ${roomId} ${asSpectator ? '(Spectator)' : '(Bạn là O)'}`;
    setupRoomListeners(roomId, asSpectator);
  });
}

/* send chat to room */
function sendChatToRoom(msg) {
  if (!firebaseEnabled || !roomId) { appendChatMessage({ name: playerNameInput.value||'You', msg, t: Date.now() }); return; }
  const chatRef = db.ref(`caro_rooms/${roomId}/chat`);
  chatRef.push({ name: playerNameInput.value || 'Guest', msg, t: Date.now() });
}

/* ========== Leaderboard push ========== */
function pushLeaderboardEntry(entry) {
  if (!entry) return;
  const e = { winner: entry.winner||'Unknown', reason: entry.reason||'', room: entry.room||'', t: Date.now() };
  if (firebaseEnabled) {
    const lbRef = db.ref('leaderboard');
    lbRef.push(e, err => { if (err) console.warn('Push LB failed', err); else fetchAndRenderGlobalLeaderboard(); });
  } else {
    console.log('LB not pushed (firebase disabled)');
  }
}

/* ========== Connectivity & reconnect helpers ========== */
function monitorConnection() {
  if (!firebaseEnabled) return;
  const connectedRef = db.ref('.info/connected');
  connectedRef.on('value', snap => {
    if (snap.val() === true) {
      console.log('Connected to Firebase');
      if (roomId) { tryReconnectToRoom(); setupRoomListeners(roomId, isSpectator); }
    } else {
      console.log('Disconnected from Firebase');
      setStatus('Mất kết nối — sẽ tự reconnect');
    }
  });
}

function tryReconnectToRoom() {
  if (!firebaseEnabled || !roomId) return;
  const stRef = db.ref(`caro_rooms/${roomId}/state`);
  stRef.once('value').then(snap => {
    if (!snap.exists()) return;
    const st = snap.val();
    if (st && st.board && st.board.length === ROWS*COLS) {
      loadBoardFromFlat(st.board); updateCells();
      if (st.turn) { turn = st.turn; setTurnLabel(turn); }
    }
  }).catch(e => console.warn('Reconnect failed', e));
}

/* ========== End of PHẦN 2 ========== */
/* =========================
   PHẦN 3 — AI Cris++ (Smart, Non-Random)
   ========================= */

/* --- Utility: clone board --- */
function cloneBoard(bd) {
  return bd.map(row => row.slice());
}

/* --- Utility: get candidate cells near existing stones --- */
function getCandidateCells(bd, radius = 2) {
  const set = new Set();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (bd[r][c] !== null) {
        for (let dr = -radius; dr <= radius; dr++) {
          for (let dc = -radius; dc <= radius; dc++) {
            const rr = r + dr, cc = c + dc;
            if (
              rr >= 0 &&
              rr < ROWS &&
              cc >= 0 &&
              cc < COLS &&
              bd[rr][cc] === null
            ) {
              set.add(rr * COLS + cc);
            }
          }
        }
      }
    }
  }

  const arr = Array.from(set).map(v => ({
    r: Math.floor(v / COLS),
    c: v % COLS
  }));

  // nếu bàn trống → đi giữa
  if (arr.length === 0)
    return [{ r: Math.floor(ROWS / 2), c: Math.floor(COLS / 2) }];

  return arr;
}

/* --- AI main entry --- */
function AI_getMove(bd, aiSymbol) {
  const opp = aiSymbol === 'X' ? 'O' : 'X';

  // 1) candidate cells
  const candidates = getCandidateCells(bd, 2);

  // 2) immediate win
  for (const cell of candidates) {
    const { r, c } = cell;
    if (bd[r][c] !== null) continue;
    bd[r][c] = aiSymbol;
    if (checkWinBoard(bd, r, c, aiSymbol)) {
      bd[r][c] = null;
      return { r, c };
    }
    bd[r][c] = null;
  }

  // 3) immediate block
  for (const cell of candidates) {
    const { r, c } = cell;
    if (bd[r][c] !== null) continue;
    bd[r][c] = opp;
    if (checkWinBoard(bd, r, c, opp)) {
      bd[r][c] = null;
      return { r, c };
    }
    bd[r][c] = null;
  }

  // 4) try fork (double threat)
  const fork = findForkMove(bd, aiSymbol, opp, candidates);
  if (fork) return fork;

  // 5) heuristic evaluation
  let best = null;
  let bestScore = -Infinity;

  for (const cell of candidates) {
    const { r, c } = cell;
    if (bd[r][c] !== null) continue;

    const score = evaluateCellHeuristic(bd, r, c, aiSymbol, opp);

    if (score > bestScore) {
      bestScore = score;
      best = { r, c };
    }
  }

  if (!best) return { r: Math.floor(ROWS / 2), c: Math.floor(COLS / 2) };
  return best;
}

/* --- check immediate win with direct 5 --- */
function checkWinBoard(bd, r, c, who) {
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1]
  ];
  for (const d of dirs) {
    let cnt = 1;
    for (let s = 1; s < WIN; s++) {
      const rr = r + d[0] * s,
        cc = c + d[1] * s;
      if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || bd[rr][cc] !== who)
        break;
      cnt++;
    }
    for (let s = 1; s < WIN; s++) {
      const rr = r - d[0] * s,
        cc = c - d[1] * s;
      if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || bd[rr][cc] !== who)
        break;
      cnt++;
    }
    if (cnt >= WIN) return true;
  }
  return false;
}

/* --- 2-ply fork detection --- */
function findForkMove(bd, ai, opp, candidates) {
  for (const cell of candidates) {
    const { r, c } = cell;
    if (bd[r][c] !== null) continue;

    const bd1 = cloneBoard(bd);
    bd1[r][c] = ai;

    // nếu tự thắng ngay thì chọn luôn
    if (checkWinBoard(bd1, r, c, ai)) return { r, c };

    let winningReplies = 0;

    const oppMoves = getCandidateCells(bd1, 2);
    for (const oc of oppMoves) {
      const bd2 = cloneBoard(bd1);
      if (bd2[oc.r][oc.c] !== null) continue;
      bd2[oc.r][oc.c] = opp;

      const aiReplies = getCandidateCells(bd2, 2);
      let canWin = false;

      for (const ar of aiReplies) {
        if (bd2[ar.r][ar.c] !== null) continue;
        bd2[ar.r][ar.c] = ai;

        if (checkWinBoard(bd2, ar.r, ar.c, ai)) {
          canWin = true;
          bd2[ar.r][ar.c] = null;
          break;
        }
        bd2[ar.r][ar.c] = null;
      }

      if (canWin) winningReplies++;
      if (winningReplies >= 2) return { r, c }; // fork!
    }
  }

  return null;
}

/* --- Evaluate heuristic for each cell --- */
function evaluateCellHeuristic(bd, r, c, ai, opp) {
  let score = 0;

  bd[r][c] = ai;

  if (checkWinBoard(bd, r, c, ai)) {
    bd[r][c] = null;
    return 100000; // direct win
  }

  score += countThreats(bd, r, c, ai) * 10;

  bd[r][c] = opp;
  score += countThreats(bd, r, c, opp) * 8;

  // center bias
  score += 20 - (Math.abs(r - ROWS / 2) + Math.abs(c - COLS / 2)) * 0.5;

  bd[r][c] = null;
  return score;
}

/* --- Threat evaluation (open-4, open-3…) --- */
function countThreats(bd, r, c, who) {
  let total = 0;
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1]
  ];

  for (const d of dirs) {
    let line = [{ r, c }];

    // gather forward
    for (let s = 1; s < WIN; s++) {
      const rr = r + d[0] * s,
        cc = c + d[1] * s;
      if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) break;
      line.push({ r: rr, c: cc });
    }

    // gather backward
    for (let s = 1; s < WIN; s++) {
      const rr = r - d[0] * s,
        cc = c - d[1] * s;
      if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) break;
      line.unshift({ r: rr, c: cc });
    }

    // slide window of length 5 along this line
    for (let i = 0; i + WIN <= line.length; i++) {
      let cnt = 0,
        empty = 0,
        opp = 0;

      for (let k = 0; k < WIN; k++) {
        const p = line[i + k];
        const v = bd[p.r][p.c];
        if (v === who) cnt++;
        else if (v === null) empty++;
        else opp++;
      }

      if (opp === 0) {
        if (cnt === 4 && empty === 1) total += 1000;
        else if (cnt === 3 && empty === 2) total += 250;
        else if (cnt === 2 && empty === 3) total += 40;
      } else {
        if (cnt === 4 && opp === 1) total += 200;
      }
    }
  }

  return total;
}

/* ========== End of PHẦN 3 ========== */
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
    const counts = {};
    Object.values(data).forEach(it => {
      if (!it || !it.winner) return;
      counts[it.winner] = (counts[it.winner] || 0) + 1;
    });
    const arr = Object.keys(counts).map(k => ({ name: k, wins: counts[k] }));
    arr.sort((a, b) => b.wins - a.wins);
    leaderList.innerHTML = '';
    arr.slice(0, 20).forEach(i => {
      const li = document.createElement('li');
      li.textContent = `${i.name}: ${i.wins} thắng`;
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

/* ========== Small utilities ========== */
/* handle timer expiry */
function onTimeExpired() {
  if (!playing) return;
  const loser = turn;
  const winner = (turn === 'X') ? 'O' : 'X';
  const winnerName = getNameForSymbol(winner);
  setStatus(`Hết giờ! ${winner} thắng`);
  playing = false;
  stopTimer();
  saveLocalResult(getNameForSymbol('X'), getNameForSymbol('O'), winnerName, { reason: 'timeout' });
  pushLeaderboardEntry({ winner: winnerName, reason: 'timeout', room: roomId || 'local' });
  if (firebaseEnabled && mode === 'online' && roomId) {
    const histRef = db.ref(`caro_rooms/${roomId}/history`);
    histRef.push({ t: Date.now(), winner: winnerName, reason: 'timeout' });
  }
}

/* debug helper: print board to console */
function debugPrintBoard() {
  console.log(board.map(r => r.map(c => c || '.').join(' ')).join('\n'));
}

/* ========== End of PHẦN 4 — game.js complete ========= */
