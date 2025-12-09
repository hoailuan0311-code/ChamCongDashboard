/***********************************************************
 * game.js — Caro (Gomoku) Full (REBUILT AI)
 *
 * Notes:
 * - Drop this file into /game/caro/game.js (replace old one).
 * - Firebase features (online, chat, leaderboard) still present;
 *   to enable online, paste your firebaseConfig into the firebaseConfig object.
 * - AI rebuilt: tightened candidate zone, immediate win/block,
 *   2-ply lookahead for decisive forks, threat-based scoring.
 * - UI effects controlled in CSS: grid border, animation, neon mode, win highlight.
 *
 * Author: Assistant (Cris Studio helper)
 ***********************************************************/

/* ========== CONFIG ========== */

// Board dimensions & win length
const COLS = 30, ROWS = 20, WIN = 5;

// Timer seconds per move
const TURN_TIMEOUT = 30;

// Firebase config placeholder -> REPLACE with your actual config to enable online features
const firebaseConfig = {
  // apiKey: "...",
  // authDomain: "...",
  // databaseURL: "https://<your-db>.firebaseio.com",
  // projectId: "...",
  // storageBucket: "...",
  // messagingSenderId: "...",
  // appId: "..."
};

/* ========== DOM refs ==========
   Assumes index.html contains elements with these IDs (as provided earlier)
=================================*/
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
let board = []; // ROWS x COLS null|'X'|'O'
let cells = []; // DOM cells
let turn = 'X'; // whose move globally
let mySymbol = 'X'; // this client symbol when online
let playing = false;
let mode = 'ai'; // 'ai'|'online'|'spectate'
let roomId = null;
let isHost = false;
let isSpectator = false;

let timerInterval = null;
let timerRemaining = TURN_TIMEOUT;

/* Firebase runtime */
let firebaseEnabled = false;
let db = null;
let roomMovesRef = null;
let roomStateRef = null;
let roomChatRef = null;

/* ========== Firebase init ========== */
function initFirebase() {
  if (!firebaseConfig || Object.keys(firebaseConfig).length === 0) {
    firebaseEnabled = false;
    console.warn('Firebase not configured — online disabled.');
    return;
  }
  try {
    const app = firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    firebaseEnabled = true;
    console.log('Firebase initialized.');
  } catch (e) {
    firebaseEnabled = false;
    console.warn('Firebase init failed:', e);
  }
}
initFirebase();

/* ========== Board helpers ========== */
function makeEmptyBoard() {
  board = Array.from({length: ROWS}, () => Array.from({length: COLS}, () => null));
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

/* ========== Render ========== */
function renderBoard() {
  gameArea.innerHTML = '';
  cells = [];
  gameArea.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
  gameArea.style.gridTemplateRows = `repeat(${ROWS}, 1fr)`;
  for (let r=0; r<ROWS; r++) {
    for (let c=0; c<COLS; c++) {
      const el = document.createElement('div');
      el.className = 'cell';
      el.dataset.r = r;
      el.dataset.c = c;
      el.addEventListener('click', onCellClick);
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
      el.className = 'cell';
      el.textContent = '';
      const v = board[r][c];
      if (v === 'X') {
        el.classList.add('x');
        el.textContent = 'X';
      } else if (v === 'O') {
        el.classList.add('o');
        el.textContent = 'O';
      }
    }
  }
}

function cellBy(r,c) {
  return cells[r*COLS + c];
}

/* ========== Win detection (returns winning segment if any) ========== */
function checkWinWithLine(r, c, who, bd = board) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (const d of dirs) {
    let line = [{r,c}];
    for (let s=1; s<WIN; s++) {
      const rr = r + d[0]*s, cc = c + d[1]*s;
      if (rr<0||rr>=ROWS||cc<0||cc>=COLS) break;
      if (bd[rr][cc] === who) line.push({r:rr,c:cc}); else break;
    }
    for (let s=1; s<WIN; s++) {
      const rr = r - d[0]*s, cc = c - d[1]*s;
      if (rr<0||rr>=ROWS||cc<0||cc>=COLS) break;
      if (bd[rr][cc] === who) line.push({r:rr,c:cc}); else break;
    }
    if (line.length >= WIN) {
      // find contiguous segment of length WIN containing (r,c)
      line.sort((a,b) => a.r*COLS + a.c - (b.r*COLS + b.c));
      for (let i=0;i<=line.length-WIN;i++) {
        const seg = line.slice(i,i+WIN);
        // check contiguous along d
        let ok = true;
        for (let k=1;k<seg.length;k++) {
          if (seg[k].r - seg[k-1].r !== d[0] || seg[k].c - seg[k-1].c !== d[1]) { ok=false; break; }
        }
        if (ok) return seg;
      }
      return line.slice(0,WIN);
    }
  }
  return null;
}

function highlightWin(line) {
  cells.forEach(c => c.classList.remove('win'));
  if (!line) return;
  for (const p of line) {
    const el = cellBy(p.r,p.c); if (el) el.classList.add('win');
  }
}

/* ========== UI helpers ========== */
function setStatus(s) { statusLabel.textContent = s; }
function setTurnLabel(v) { turnLabel.textContent = v; }

/* ========== Local storage history ========== */
function saveLocalResult(p1, p2, winnerName, meta={}) {
  const arr = JSON.parse(localStorage.getItem('cris_caro_history') || '[]');
  arr.push({ time: (new Date()).toLocaleString(), p1, p2, result: { winner: winnerName, meta }});
  localStorage.setItem('cris_caro_history', JSON.stringify(arr));
  renderLocalLeaderboard();
}

function renderLocalLeaderboard() {
  const arr = JSON.parse(localStorage.getItem('cris_caro_history') || '[]');
  const counts = {};
  for (const it of arr) {
    if (it && it.result && it.result.winner) {
      counts[it.result.winner] = (counts[it.result.winner]||0)+1;
    }
  }
  leaderList.innerHTML = '';
  Object.keys(counts).sort((a,b)=>counts[b]-counts[a]).slice(0,20).forEach(name=>{
    const li = document.createElement('li'); li.textContent = `${name}: ${counts[name]} thắng`; leaderList.appendChild(li);
  });
}

/* ========== Chat UI ========== */
function appendChatMessage(item) {
  const wrap = document.createElement('div'); wrap.className = 'chat-item';
  const time = new Date(item.t||Date.now()).toLocaleTimeString();
  wrap.innerHTML = `<b>${escapeHtml(item.name||'Anon')}</b> <small>${time}</small><div>${escapeHtml(item.msg)}</div>`;
  chatMessages.appendChild(wrap); chatMessages.scrollTop = chatMessages.scrollHeight;
}
function escapeHtml(s){ if (!s && s !== 0) return ''; return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

/* ========== Timer ========== */
function resetTimer() {
  stopTimer();
  timerRemaining = TURN_TIMEOUT;
  timerLabel.textContent = timerRemaining;
  timerInterval = setInterval(()=> {
    timerRemaining--;
    timerLabel.textContent = timerRemaining;
    if (timerRemaining <= 0) {
      clearInterval(timerInterval);
      onTimeExpired();
    }
  }, 1000);
}
function stopTimer() { clearInterval(timerInterval); timerLabel.textContent = '-'; }

/* ========== Player name helper ========== */
function getNameForSymbol(sym) {
  if (mode === 'ai') {
    if (sym === 'X') return playerNameInput.value.trim() || 'Player';
    return 'Cris';
  } else { // local or online
    if (sym === 'X') return isHost ? (playerNameInput.value.trim()||'Host') : 'PlayerX';
    if (sym === 'O') return isHost ? 'Guest' : (playerNameInput.value.trim()||'Player');
    return sym;
  }
}

/* ========== Move handling ========== */
function onCellClick(e) {
  if (!playing) return;
  if (isSpectator) return;
  const r = parseInt(e.currentTarget.dataset.r,10), c = parseInt(e.currentTarget.dataset.c,10);
  if (board[r][c]) return;

  if (mode === 'online') {
    if (turn !== mySymbol) return;
    makeAndPushMove(r,c,mySymbol);
    return;
  }

  // local or ai
  makeAndApplyMove(r,c,turn);
  const line = checkWinWithLine(r,c,turn);
  if (line) {
    highlightWin(line); playing = false; setStatus(`${turn} thắng!`);
    const winnerName = getNameForSymbol(turn);
    saveLocalResult(getNameForSymbol('X'), getNameForSymbol('O'), winnerName);
    pushLeaderboardEntry({ winner: winnerName, reason: 'win', room: 'local' });
    stopTimer();
    return;
  }
  // draw?
  if (boardIsFull()) { playing=false; setStatus('Hòa!'); saveLocalResult(getNameForSymbol('X'), getNameForSymbol('O'),'Hòa'); stopTimer(); return; }

  // toggle turn
  turn = (turn === 'X' ? 'O' : 'X');
  setTurnLabel(turn);
  resetTimer();

  if (mode === 'ai' && playing && turn === 'O') {
    setStatus('Cris đang suy nghĩ...');
    // short delay for feel
    setTimeout(()=> {
      const mv = AI_getMove(board,'O');
      if (!mv) { playing = false; setStatus('Hòa!'); saveLocalResult(getNameForSymbol('X'), getNameForSymbol('O'),'Hòa'); stopTimer(); return; }
      makeAndApplyMove(mv.r,mv.c,'O');
      const line2 = checkWinWithLine(mv.r,mv.c,'O');
      if (line2) { highlightWin(line2); playing=false; setStatus('Cris (O) thắng!'); saveLocalResult(getNameForSymbol('X'), getNameForSymbol('O'),'Cris'); pushLeaderboardEntry({winner:'Cris',reason:'win',room:'local'}); stopTimer(); return; }
      turn = 'X'; setTurnLabel(turn); setStatus('Lượt bạn'); resetTimer();
    }, 250);
  }
}

/* apply move locally */
function makeAndApplyMove(r,c,who) {
  board[r][c] = who; updateCells();
}

/* push move to firebase (online) */
function makeAndPushMove(r,c,who) {
  if (!firebaseEnabled || !roomId) { alert('Online chưa bật hoặc chưa vào phòng.'); return; }
  const movesRef = db.ref(`caro_rooms/${roomId}/moves`);
  const newMv = movesRef.push();
  newMv.set({ r, c, who, t: Date.now() }, err=> {
    if (err) console.warn('Push move failed',err);
    else {
      // also update state snapshot
      const stateRef = db.ref(`caro_rooms/${roomId}/state`);
      board[r][c] = who; updateCells();
      stateRef.set({ board: flatBoard(), turn: (who==='X'?'O':'X'), lastMove: {r,c,who,t:Date.now()}});
      // check win locally
      const line = checkWinWithLine(r,c,who);
      if (line) {
        highlightWin(line); playing=false; setStatus(`${who} thắng!`);
        const winnerName = (who === mySymbol) ? (playerNameInput.value.trim()||'Player') : 'Opponent';
        saveLocalResult(getNameForSymbol('X'), getNameForSymbol('O'), winnerName);
        pushLeaderboardEntry({ winner: winnerName, reason: 'win', room: roomId });
        const histRef = db.ref(`caro_rooms/${roomId}/history`); histRef.push({ t: Date.now(), winner: winnerName, reason:'win' });
      } else {
        turn = (who==='X'?'O':'X'); setTurnLabel(turn); resetTimer();
      }
    }
  });
}

/* ========== Online room listeners ========== */
function setupRoomListeners(rid, spectator=false) {
  if (!firebaseEnabled) return;
  roomId = rid; isSpectator = spectator;
  roomMovesRef = db.ref(`caro_rooms/${roomId}/moves`);
  roomStateRef = db.ref(`caro_rooms/${roomId}/state`);
  roomChatRef = db.ref(`caro_rooms/${roomId}/chat`);
  const histRef = db.ref(`caro_rooms/${roomId}/history`);

  // load or init state
  roomStateRef.once('value').then(snap=>{
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
    const mv = snap.val(); if (!mv) return;
    // if already filled locally skip
    if (board[mv.r][mv.c]) return;
    board[mv.r][mv.c] = mv.who; updateCells();
    const line = checkWinWithLine(mv.r,mv.c,mv.who);
    if (line) { highlightWin(line); playing=false; setStatus(`${mv.who} thắng!`); saveLocalResult(getNameForSymbol('X'), getNameForSymbol('O'), (mv.who===mySymbol?playerNameInput.value||'You':'Opponent')); }
    else { turn = mv.who === 'X' ? 'O' : 'X'; setTurnLabel(turn); resetTimer(); }
  });

  // chat
  roomChatRef.limitToLast(200).on('child_added', snap => {
    appendChatMessage(snap.val());
  });

  histRef.limitToLast(5).on('child_added', snap => {
    const it = snap.val(); if (!it) return;
    roomStatus.textContent = `Phòng ${roomId} — Lịch sử: ${it.winner || '-'}`;
  });

  playing = true; setStatus('Kết nối phòng — chờ lượt'); resetTimer();
}

/* create room */
function createRoom() {
  if (!firebaseEnabled) { alert('Firebase chưa cấu hình'); return; }
  const id = Math.random().toString(36).slice(2,9);
  roomId = id; isHost = true; mySymbol = 'X'; isSpectator = false;
  const rRef = db.ref(`caro_rooms/${roomId}`);
  rRef.set({ createdAt: Date.now(), hostName: playerNameInput.value.trim()||'Host', state: { board: flatBoard(), turn:'X', lastMove:null }}, err=>{
    if (err) { alert('Tạo phòng lỗi'); } else { roomStatus.textContent = `Phòng: ${roomId} (Bạn là Host/X)`; setupRoomListeners(roomId,false); }
  });
}

/* join room */
function joinRoom(id, asSpectator=false) {
  if (!firebaseEnabled) { alert('Firebase chưa cấu hình'); return; }
  if (!id) { alert('Nhập mã phòng'); return; }
  const rRef = db.ref(`caro_rooms/${id}`);
  rRef.once('value').then(snap=>{
    if (!snap.exists()) { alert('Phòng không tồn tại'); return; }
    roomId = id; isHost = false; isSpectator = asSpectator; mySymbol = asSpectator ? null : 'O';
    roomStatus.textContent = `Vào phòng ${roomId} ${asSpectator?'(Spectator)':'(Bạn là O)'}`; setupRoomListeners(roomId, asSpectator);
  });
}

/* push chat */
function sendChatToRoom(msg) {
  if (!firebaseEnabled || !roomId) { appendChatMessage({ name: playerNameInput.value||'You', msg, t: Date.now() }); return; }
  const chatRef = db.ref(`caro_rooms/${roomId}/chat`);
  chatRef.push({ name: playerNameInput.value || 'Guest', msg, t: Date.now() });
}

/* ========== Leaderboard (push/read) ========== */
function pushLeaderboardEntry(entry) {
  if (!entry) return;
  const e = { winner: entry.winner||'Unknown', reason: entry.reason||'', room: entry.room||'', t: Date.now() };
  if (firebaseEnabled) {
    const lbRef = db.ref('leaderboard');
    lbRef.push(e, err => { if (err) console.warn('LB push failed', err); else fetchAndRenderGlobalLeaderboard(); });
  }
}
function fetchAndRenderGlobalLeaderboard() {
  if (!firebaseEnabled) { renderLocalLeaderboard(); return; }
  const lbRef = db.ref('leaderboard').limitToLast(5000);
  lbRef.once('value').then(snap=>{
    const data = snap.val() || {};
    const counts = {};
    Object.values(data).forEach(it => { if (!it) return; counts[it.winner] = (counts[it.winner]||0)+1; });
    const arr = Object.keys(counts).map(k=>({name:k,wins:counts[k]})).sort((a,b)=>b.wins-a.wins);
    leaderList.innerHTML = '';
    arr.slice(0,20).forEach(i=>{ const li=document.createElement('li'); li.textContent = `${i.name}: ${i.wins} thắng`; leaderList.appendChild(li); });
  }).catch(e => { console.warn('fetch lb fail', e); renderLocalLeaderboard(); });
}

/* ========== Connectivity monitor (reconnect) ========== */
function monitorConnection() {
  if (!firebaseEnabled) return;
  const connectedRef = db.ref('.info/connected');
  connectedRef.on('value', snap => {
    if (snap.val() === true) {
      console.log('Connected to Firebase');
      if (roomId) { tryReconnectToRoom(); setupRoomListeners(roomId, isSpectator); }
    } else {
      console.log('Firebase disconnected');
      setStatus('Mất kết nối — sẽ reconnect khi mạng về');
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
  }).catch(e => console.warn('Reconnect failed',e));
}

/* ========== Board utilities ========== */
function boardIsFull() {
  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) if (!board[r][c]) return false;
  return true;
}

/* ========== AI REBUILD (clean, robust, no spam moves) ===========
   Approach:
   - Build strong candidate list: empty cells that are within distance 2 of existing stones.
   - Immediate checks: win / block.
   - 2-ply lookahead for forced forks: simulate ai->opp->ai to find forced win.
   - Scoring by threat patterns and open sequences.
=================================================================*/

/* Utility: neighbors within distance radius */
function getCandidateCells(bd, radius=2) {
  const set = new Set();
  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) {
    if (bd[r][c] !== null) {
      for (let dr=-radius; dr<=radius; dr++) for (let dc=-radius; dc<=radius; dc++) {
        const rr = r+dr, cc = c+dc;
        if (rr>=0 && rr<ROWS && cc>=0 && cc<COLS && bd[rr][cc]===null) set.add(rr*COLS+cc);
      }
    }
  }
  const arr = Array.from(set).map(x => ({ r: Math.floor(x/COLS), c: x%COLS }));
  // if board empty or arr empty, return center
  if (arr.length === 0) return [{ r: Math.floor(ROWS/2), c: Math.floor(COLS/2) }];
  return arr;
}

/* deep copy board */
function cloneBoard(bd) {
  return bd.map(row => row.slice());
}

/* simple 2-ply lookahead to find forced win:
   For each candidate move M by AI: simulate M, then for each opponent reply R,
   check if AI has immediate winning reply after R. If for some M, AI creates
   at least two replies that lead to immediate win (double threat), choose it.
*/
function findForkMove(bd, ai, opp, candidates) {
  for (const cell of candidates) {
    const {r,c} = cell;
    if (bd[r][c] !== null) continue;
    const bd1 = cloneBoard(bd);
    bd1[r][c] = ai;
    // if immediate win, return
    if (checkWinBoard(bd1, r, c, ai)) return {r,c};
    // count replies for opp that prevent all AI immediate wins
    let aiWinningReplies = 0;
    // find opp candidate replies (nearby)
    const oppCandidates = getCandidateCells(bd1,2);
    for (const rc of oppCandidates) {
      const bo2 = cloneBoard(bd1);
      if (bo2[rc.r][rc.c] !== null) continue;
      bo2[rc.r][rc.c] = opp;
      // check if AI has a winning move now
      const nextCandidates = getCandidateCells(bo2,2);
      let foundImmediate = false;
      for (const nc of nextCandidates) {
        if (bo2[nc.r][nc.c] !== null) continue;
        bo2[nc.r][nc.c] = ai;
        if (checkWinBoard(bo2, nc.r, nc.c, ai)) {
          foundImmediate = true;
          bo2[nc.r][nc.c] = null;
          break;
        }
        bo2[nc.r][nc.c] = null;
      }
      if (foundImmediate) aiWinningReplies++;
      if (aiWinningReplies >= 2) return {r,c}; // double threat
    }
  }
  return null;
}

/* main AI decision function */
function AI_getMove(bd, aiSymbol) {
  const opp = aiSymbol === 'X' ? 'O' : 'X';

  // 1) candidate set
  const candidates = getCandidateCells(bd, 2);

  // 2) immediate win
  for (const cell of candidates) {
    const {r,c} = cell;
    if (bd[r][c] !== null) continue;
    bd[r][c] = aiSymbol;
    if (checkWinBoard(bd, r, c, aiSymbol)) { bd[r][c] = null; return {r,c}; }
    bd[r][c] = null;
  }

  // 3) immediate block opponent win
  for (const cell of candidates) {
    const {r,c} = cell;
    if (bd[r][c] !== null) continue;
    bd[r][c] = opp;
    if (checkWinBoard(bd, r, c, opp)) { bd[r][c] = null; return {r,c}; }
    bd[r][c] = null;
  }

  // 4) fork detection (2-ply)
  const fork = findForkMove(bd, aiSymbol, opp, candidates);
  if (fork) return fork;

  // 5) heuristic scoring
  let best = null, bestScore = -Infinity;
  for (const cell of candidates) {
    const {r,c} = cell;
    if (bd[r][c] !== null) continue;
    const score = evaluateCellHeuristic(bd, r, c, aiSymbol, opp);
    if (score > bestScore) { bestScore = score; best = {r,c}; }
  }
  // fallback center if nothing
  if (!best) return { r: Math.floor(ROWS/2), c: Math.floor(COLS/2) };
  return best;
}

/* Evaluate heuristics for a cell: pattern detection: open-4, open-3, blocked-4, etc */
function evaluateCellHeuristic(bd, r, c, ai, opp) {
  let score = 0;
  // simulate placing ai at r,c
  bd[r][c] = ai;
  if (checkWinBoard(bd, r, c, ai)) { bd[r][c] = null; return 100000; }
  // count open sequences for ai and opp
  score += countThreats(bd, r, c, ai) * 10;
  // also consider blocking opponent threats
  bd[r][c] = opp;
  score += countThreats(bd, r, c, opp) * 8; // block weight
  bd[r][c] = ai; // revert to ai for center bias
  // center bias
  score += 20 - (Math.abs(r-ROWS/2)+Math.abs(c-COLS/2))*0.5;
  bd[r][c] = null;
  return score;
}

/* countThreats returns weighted sum of sequences (open-4, open-3, etc) for who at cell r,c
   Higher weights for open-4 > closed-4 > open-3...
*/
function countThreats(bd, r, c, who) {
  let total = 0;
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (const d of dirs) {
    // gather contiguous cells in this line after placing at r,c
    let line = [{r,c}];
    for (let s=1; s<WIN; s++) {
      const rr=r+d[0]*s, cc=c+d[1]*s;
      if (rr<0||rr>=ROWS||cc<0||cc>=COLS) break;
      line.push({r:rr,c:cc});
    }
    for (let s=1; s<WIN; s++) {
      const rr=r-d[0]*s, cc=c-d[1]*s;
      if (rr<0||rr>=ROWS||cc<0||cc>=COLS) break;
      line.unshift({r:rr,c:cc});
    }
    // analyze sliding windows of length WIN across this line
    for (let i=0;i+WIN<=line.length;i++) {
      let cnt=0, empty=0, oppCnt=0;
      for (let k=0;k<WIN;k++) {
        const p = line[i+k];
        const v = bd[p.r][p.c];
        if (v === who) cnt++;
        else if (v === null) empty++;
        else oppCnt++;
      }
      if (oppCnt === 0) {
        // no enemy in window -> threat
        if (cnt === 4 && empty === 1) total += 1000; // almost win
        else if (cnt === 3 && empty === 2) total += 250;
        else if (cnt === 2 && empty === 3) total += 40;
      } else {
        // blocked windows less valuable
        if (cnt === 4 && oppCnt === 1) total += 200;
      }
    }
  }
  return total;
}

/* ========== Initialization & UI wiring ========== */
startBtn.addEventListener('click', ()=> {
  mode = modeSelect.value;
  if (mode === 'online') { onlineOptions.style.display = 'block'; setStatus('Chọn tạo phòng hoặc vào phòng'); }
  else { onlineOptions.style.display = 'none'; startLocalOrAI(); }
});

resetBtn.addEventListener('click', ()=> {
  makeEmptyBoard(); updateCells(); playing=false; setStatus('Reset'); stopTimer(); cells.forEach(c=>c.classList.remove('win'));
});

if (createRoomBtn) createRoomBtn.addEventListener('click', ()=> createRoom());
if (joinRoomBtn) joinRoomBtn.addEventListener('click', ()=> joinRoom(roomInput.value.trim(), false));

sendChatBtn.addEventListener('click', ()=> {
  const msg = chatInput.value.trim(); if (!msg) return;
  if (!firebaseEnabled || !roomId) { appendChatMessage({name:playerNameInput.value||'You', msg, t:Date.now()}); chatInput.value=''; return; }
  sendChatToRoom(msg); chatInput.value='';
});

/* keyboard start */
document.addEventListener('keydown', e => { if (e.code === 'Space') { if (!playing) startBtn.click(); } });

/* start local or ai mode */
function startLocalOrAI() {
  makeEmptyBoard(); renderBoard();
  turn = 'X'; setTurnLabel(turn);
  playing = true; isSpectator = false; roomId = null; isHost = false; mySymbol='X';
  setStatus(mode === 'ai' ? 'Chơi với Cris — Bạn là X' : 'Local: 2 người cùng máy');
  resetTimer();
}

/* boot */
function boot() {
  makeEmptyBoard(); renderBoard(); renderLocalLeaderboard();
  if (firebaseEnabled) { monitorConnection(); fetchAndRenderGlobalLeaderboard(); }
  else setStatus('Offline (Firebase chưa cấu hình)');
  // auto join if url has room param
  const params = new URLSearchParams(window.location.search);
  const r = params.get('room'), m = params.get('mode');
  if (r) { if (m === 'spectate') joinRoom(r,true); else joinRoom(r,false); }
}
boot();

/* ========== Utility: checkWinBoard used by AI */
function checkWinBoard(bd, r, c, who) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (const d of dirs) {
    let cnt = 1;
    for (let s=1;s<WIN;s++) {
      const rr = r + d[0]*s, cc = c + d[1]*s;
      if (rr<0||rr>=ROWS||cc<0||cc>=COLS||bd[rr][cc] !== who) break;
      cnt++;
    }
    for (let s=1;s<WIN;s++) {
      const rr = r - d[0]*s, cc = c - d[1]*s;
      if (rr<0||rr>=ROWS||cc<0||cc>=COLS||bd[rr][cc] !== who) break;
      cnt++;
    }
    if (cnt >= WIN) return true;
  }
  return false;
}

/* ========== End of file ========== */

/* Notes for Cris:
 - This AI is cautious: candidate cells limited to radius 2; that prevents
   it from placing scattered nonsense across the board.
 - It checks immediate win and immediate block first, then fork detection,
   finally heuristic scoring based on open sequences.
 - If you want higher difficulty, we can increase lookahead depth (more CPU).
 - If you want "Cris Boss" (nearly unbeatable), I can add MCTS or deeper minimax with alpha-beta.
 - For UI enhancements (neon toggle, animations, sound), update style.css and I can wire sound hooks.
*/
