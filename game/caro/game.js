/***********************************************************
 * game.js — Caro (Gomoku) Full
 * Features:
 *  - Single UI: mode = ai | online | spectate
 *  - AI (Cris Pro) heuristic (win/block + pattern scoring)
 *  - Online using Firebase Realtime Database:
 *      - Room create / join
 *      - Moves sync, room state, chat
 *      - Spectator mode
 *      - Reconnect handling
 *  - Timer per move (30s)
 *  - Highlight win (5-in-a-row)
 *  - Global leaderboard (aggregate client-side from 'leaderboard' entries)
 *  - LocalStorage backup (history)
 *
 * Usage: drop into /game/caro/game.js and include in index.html
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

// ========== DOM / UI refs ==========
const playerNameInput = document.getElementById('playerName');
const modeSelect = document.getElementById('modeSelect');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');

const onlineOptions = document.getElementById('onlineOptions') || document.getElementById('onlineOptions');
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

let cells = []; // array of DOM cells for quick access

/* ========== State ========== */
let board = []; // ROWS x COLS array with null | 'X' | 'O'
let turn = 'X'; // whose move (X starts)
let mySymbol = 'X'; // this client's symbol (for online) default X
let playing = false;
let mode = 'ai'; // 'ai' | 'online' | 'spectate'
let roomId = null;
let isHost = false;
let isSpectator = false;

let timerInterval = null;
let timerRemaining = TURN_TIMEOUT;

// Firebase runtime
let firebaseEnabled = false;
let db = null;
let roomMovesRef = null;
let roomStateRef = null;
let roomChatRef = null;
let roomPresenceRef = null;

/* ========== Firebase Init ========== */
function initFirebase() {
  if (!firebaseConfig || Object.keys(firebaseConfig).length === 0) {
    console.warn('Firebase config not provided — online features disabled.');
    firebaseEnabled = false;
    return;
  }
  try {
    const app = firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    firebaseEnabled = true;
    console.log('Firebase initialized — online features enabled.');
  } catch (e) {
    firebaseEnabled = false;
    console.warn('Firebase init failed:', e);
  }
}
initFirebase();

/* ========== Helpers ========== */

function makeEmptyBoard() {
  board = Array.from({length: ROWS}, () => Array.from({length: COLS}, () => null));
}

function coordIndex(r, c) {
  return r * COLS + c;
}

function cellByRC(r, c) {
  return cells[coordIndex(r, c)];
}

function flatBoard() {
  // return flattened array for saving to Firebase
  return board.flat();
}

function loadBoardFromFlat(arr) {
  makeEmptyBoard();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = arr[r * COLS + c];
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
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
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
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = board[r][c];
      const el = cellByRC(r, c);
      el.className = 'cell';
      el.textContent = '';
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

/* ========== Win detection with returning winning line ========== */
function checkWinWithLine(r, c, who, bd = board) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (const d of dirs) {
    let line = [{r,c}];
    // forward
    for (let s = 1; s < WIN; s++) {
      const rr = r + d[0]*s, cc = c + d[1]*s;
      if (rr<0||rr>=ROWS||cc<0||cc>=COLS) break;
      if (bd[rr][cc] === who) line.push({r: rr, c: cc});
      else break;
    }
    // backward
    for (let s = 1; s < WIN; s++) {
      const rr = r - d[0]*s, cc = c - d[1]*s;
      if (rr<0||rr>=ROWS||cc<0||cc>=COLS) break;
      if (bd[rr][cc] === who) line.push({r: rr, c: cc});
      else break;
    }
    if (line.length >= WIN) {
      // if more than WIN, pick any contiguous WIN segment containing (r,c)
      line.sort((a,b) => (a.r*COLS + a.c) - (b.r*COLS + b.c));
      // try to find contiguous run length >= WIN
      for (let i=0;i<=line.length - WIN;i++){
        const segment = line.slice(i, i+WIN);
        // check if segment is contiguous along d
        // check differences consistent
        let ok = true;
        for (let k=1;k<segment.length;k++){
          if (segment[k].r - segment[k-1].r !== d[0] || segment[k].c - segment[k-1].c !== d[1]) { ok=false; break; }
        }
        if (ok) return segment;
      }
      // fallback: return first WIN cells
      return line.slice(0, WIN);
    }
  }
  return null;
}

/* highlight winning cells */
function highlightWin(line) {
  if (!line || line.length === 0) return;
  // Clear previous win classes
  cells.forEach(c => c.classList.remove('win'));
  for (const p of line) {
    const el = cellByRC(p.r, p.c);
    if (el) el.classList.add('win');
  }
}

/* ========== UI / Status helpers ========== */
function setStatus(s) {
  statusLabel.textContent = s;
}

/* ========== Local storage history ========== */
function loadLocalHistoryUI() {
  const arr = JSON.parse(localStorage.getItem('cris_caro_history') || '[]');
  // keep only last 20 render in leaderboard UI as "recent"
  leaderList.innerHTML = '';
  const counts = {}; // aggregate wins
  for (const it of arr) {
    if (!it) continue;
    if (it.result && it.result.winner) {
      counts[it.result.winner] = (counts[it.result.winner] || 0) + 1;
    }
  }
  // create array sorted by wins desc
  const leaderboard = Object.keys(counts).map(name => ({name, wins: counts[name]}));
  leaderboard.sort((a,b) => b.wins - a.wins);
  leaderboard.slice(0,10).forEach(i => {
    const li = document.createElement('li');
    li.textContent = `${i.name}: ${i.wins} thắng (local)`;
    leaderList.appendChild(li);
  });
}

/* store game result locally */
function saveLocalResult(p1, p2, winnerName, meta = {}) {
  const arr = JSON.parse(localStorage.getItem('cris_caro_history') || '[]');
  arr.push({
    time: (new Date()).toLocaleString(),
    p1, p2,
    result: { winner: winnerName, meta }
  });
  localStorage.setItem('cris_caro_history', JSON.stringify(arr));
  loadLocalHistoryUI();
}

/* ========== Chat UI ========== */
function appendChatMessage(item) {
  const wrap = document.createElement('div');
  wrap.className = 'chat-item';
  const time = new Date(item.t || Date.now()).toLocaleTimeString();
  wrap.innerHTML = `<b>${escapeHtml(item.name || 'Anon')}</b> <small>${time}</small><div>${escapeHtml(item.msg)}</div>`;
  chatMessages.appendChild(wrap);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/* safe escape */
function escapeHtml(s) {
  if (!s && s !== 0) return '';
  return String(s).replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; });
}

/* ========== Timer handling ========== */
function resetTimer() {
  clearInterval(timerInterval);
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
  timerLabel.textContent = '-';
}

/* if timer runs out while it's someone's turn */
function onTimeExpired() {
  if (!playing) return;
  // whoever's turn it was loses
  const loser = turn;
  const winner = (turn === 'X') ? 'O' : 'X';
  const winnerName = getNameForSymbol(winner);
  const p1 = getNameForSymbol('X'), p2 = getNameForSymbol('O');

  setStatus(`Hết giờ! ${winner} thắng`);
  highlightWin([]); // no explicit line
  playing = false;

  // save result local and to Firebase leaderboard if online
  saveLocalResult(p1, p2, winnerName, {reason: 'timeout'});
  pushLeaderboardEntry({ winner: winnerName, reason: 'timeout', room: roomId || 'local' });

  // if online, push result to room history
  if (firebaseEnabled && mode === 'online' && roomId) {
    const histRef = db.ref(`caro_rooms/${roomId}/history`);
    histRef.push({ t: Date.now(), winner: winnerName, reason: 'timeout' });
  }
}

/* ========== Player naming helpers ========== */
function getNameForSymbol(sym) {
  if (mode === 'ai') {
    if (sym === 'X') return playerNameInput.value.trim() || 'Player';
    return 'Cris (AI)';
  } else {
    // online or local
    // for online: host is X, guest O by default
    if (sym === 'X') return (isHost ? (playerNameInput.value.trim() || 'Host') : (playerNameInput.value.trim() || 'PlayerX'));
    if (sym === 'O') return (isHost ? 'Guest' : (playerNameInput.value.trim() || 'Player'));
    return sym;
  }
}

/* ========== Move logic ========== */
function onCellClick(e) {
  if (!playing) return;
  if (isSpectator) return;
  const r = parseInt(e.currentTarget.dataset.r, 10);
  const c = parseInt(e.currentTarget.dataset.c, 10);
  if (board[r][c] !== null) return;

  if (mode === 'online') {
    // if not our turn, ignore
    if (turn !== mySymbol) return;
    makeAndPushMove(r, c, mySymbol);
    return;
  }

  // local or ai
  if (board[r][c] === null) {
    makeAndApplyMove(r, c, turn);
    // check win
    const line = checkWinWithLine(r, c, turn);
    if (line) {
      highlightWin(line);
      playing = false;
      setStatus(`${turn} thắng!`);
      const winnerName = getNameForSymbol(turn);
      saveLocalResult(getNameForSymbol('X'), getNameForSymbol('O'), winnerName);
      pushLeaderboardEntry({ winner: winnerName, reason: 'win', room: 'local' });
      return;
    }
    // toggle turn
    turn = (turn === 'X') ? 'O' : 'X';
    turnLabel.textContent = turn;
    resetTimer();

    // if playing vs AI and it's AI's turn -> move
    if (mode === 'ai' && playing && turn !== 'X') {
      setStatus('Cris đang đi...');
      setTimeout(() => {
        const aiMove = AI_findBestMove(board, 'O'); // AI plays O
        if (aiMove) {
          makeAndApplyMove(aiMove.r, aiMove.c, 'O');
          const line2 = checkWinWithLine(aiMove.r, aiMove.c, 'O');
          if (line2) {
            highlightWin(line2);
            playing = false;
            setStatus('Cris (O) thắng!');
            saveLocalResult(getNameForSymbol('X'), getNameForSymbol('O'), 'Cris (AI)');
            pushLeaderboardEntry({ winner: 'Cris (AI)', reason: 'win', room: 'local' });
            stopTimer();
            return;
          }
          turn = 'X';
          turnLabel.textContent = turn;
          setStatus('Lượt bạn');
          resetTimer();
        } else {
          // draw
          playing = false;
          setStatus('Hòa!');
          saveLocalResult(getNameForSymbol('X'), getNameForSymbol('O'), 'Hòa');
          pushLeaderboardEntry({ winner: 'Hòa', reason: 'draw', room: 'local' });
          stopTimer();
          return;
        }
      }, 350);
    }
  }
}

/* Apply move locally (no firebase) */
function makeAndApplyMove(r, c, who) {
  board[r][c] = who;
  updateCells();
}

/* Make move and push to Firebase (online mode) */
function makeAndPushMove(r, c, who) {
  if (!firebaseEnabled || !roomId) {
    alert('Online mode chưa bật hoặc chưa vào phòng.');
    return;
  }
  // write to moves child and update state snapshot (atomic-ish)
  const movesRef = db.ref(`caro_rooms/${roomId}/moves`);
  const newMoveRef = movesRef.push();
  newMoveRef.set({ r, c, who, t: Date.now() }, (err) => {
    if (err) {
      console.warn('Failed to push move:', err);
    } else {
      // also update room state board for resume
      const stateRef = db.ref(`caro_rooms/${roomId}/state`);
      const flat = flatBoard();
      // apply locally first before writing state: (we assume remote listener will also apply - but to be consistent apply now)
      makeAndApplyMove(r, c, who);
      stateRef.set({ board: flatBoard(), turn: (who === 'X' ? 'O' : 'X'), lastMove: { r, c, who, t: Date.now() } });
      // After pushing, check win locally
      const line = checkWinWithLine(r, c, who);
      if (line) {
        highlightWin(line);
        playing = false;
        setStatus(`${who} thắng!`);
        const winnerName = (who === mySymbol) ? (playerNameInput.value.trim() || 'Player') : 'Opponent';
        saveLocalResult(getNameForSymbol('X'), getNameForSymbol('O'), winnerName);
        pushLeaderboardEntry({ winner: winnerName, reason: 'win', room: roomId });
        // store in room history
        const histRef = db.ref(`caro_rooms/${roomId}/history`);
        histRef.push({ t: Date.now(), winner: winnerName, reason: 'win' });
      } else {
        // update turn & timer
        turn = (who === 'X') ? 'O' : 'X';
        turnLabel.textContent = turn;
        setStatus(`Đã chơi: ${who}. Đến lượt ${turn}`);
        resetTimer();
      }
    }
  });
}

/* ========== Online room listeners ========== */

/* join a room as participant or spectator.
   if spectator flag true -> won't push moves.
*/
function setupRoomListeners(rid, spectator=false) {
  if (!firebaseEnabled) return;
  roomId = rid;
  isSpectator = spectator;
  roomMovesRef = db.ref(`caro_rooms/${roomId}/moves`);
  roomStateRef = db.ref(`caro_rooms/${roomId}/state`);
  roomChatRef = db.ref(`caro_rooms/${roomId}/chat`);
  const histRef = db.ref(`caro_rooms/${roomId}/history`);

  // read snapshot state to resume board
  roomStateRef.once('value').then(snap => {
    if (snap.exists()) {
      const st = snap.val();
      if (st.board && Array.isArray(st.board) && st.board.length === ROWS*COLS) {
        loadBoardFromFlat(st.board);
        updateCells();
        if (st.turn) { turn = st.turn; turnLabel.textContent = turn; }
      }
    } else {
      // initialize blank state
      roomStateRef.set({ board: flatBoard(), turn: 'X', lastMove: null });
    }
  });

  // listen child_added moves
  roomMovesRef.on('child_added', snap => {
    const mv = snap.val();
    if (!mv) return;
    // if local board already has this cell filled, skip
    if (board[mv.r][mv.c] !== null) {
      // already applied locally
      return;
    }
    // apply move
    board[mv.r][mv.c] = mv.who;
    updateCells();

    // check win
    const line = checkWinWithLine(mv.r, mv.c, mv.who);
    if (line) {
      highlightWin(line);
      playing = false;
      setStatus(`${mv.who} thắng!`);
      // save history
      const winnerName = mv.who === mySymbol ? (playerNameInput.value.trim()||'Player') : 'Opponent';
      saveLocalResult(getNameForSymbol('X'), getNameForSymbol('O'), winnerName);
      pushLeaderboardEntry({ winner: winnerName, reason: 'win', room: roomId });
    } else {
      // set turn to next
      turn = mv.who === 'X' ? 'O' : 'X';
      turnLabel.textContent = turn;
      setStatus(`Đã có nước. Đến lượt ${turn}`);
      resetTimer();
    }
  });

  // chat listener
  roomChatRef.limitToLast(200).on('child_added', snap => {
    const msg = snap.val();
    if (!msg) return;
    appendChatMessage(msg);
  });

  // history listener: display last results (optional)
  histRef.limitToLast(10).on('child_added', snap => {
    const it = snap.val();
    if (!it) return;
    // could display in roomStatus
    roomStatus.textContent = `Phòng ${roomId} — Lịch sử gần nhất: ${it.winner || '—'}`;
  });

  playing = true;
  setStatus('Kết nối phòng — đang chờ lượt hoặc người chơi khác');
}

/* create room -> host is X */
function createRoom() {
  if (!firebaseEnabled) {
    alert('Firebase chưa cấu hình. Vui lòng dán firebaseConfig vào game.js để bật online.');
    return;
  }
  const id = Math.random().toString(36).slice(2,9);
  roomId = id;
  isHost = true;
  isSpectator = false;
  mySymbol = 'X';
  // create room structure
  const rRef = db.ref(`caro_rooms/${roomId}`);
  rRef.set({
    createdAt: Date.now(),
    hostName: playerNameInput.value.trim() || 'Host',
    state: { board: flatBoard(), turn: 'X', lastMove: null }
  }, (err) => {
    if (err) {
      alert('Tạo phòng thất bại: ' + err);
      return;
    }
    roomStatus.textContent = `Phòng tạo: ${roomId} — Bạn là host (X)`;
    setupRoomListeners(roomId, false);
  });
}

/* join room as player O (if host exists) or as spectator */
function joinRoom(id, asSpectator=false) {
  if (!firebaseEnabled) {
    alert('Firebase chưa cấu hình.');
    return;
  }
  if (!id) { alert('Nhập mã phòng'); return; }
  const rRef = db.ref(`caro_rooms/${id}`);
  rRef.once('value').then(snap => {
    if (!snap.exists()) {
      alert('Phòng không tồn tại.');
      return;
    }
    roomId = id;
    isHost = false;
    isSpectator = asSpectator;
    mySymbol = asSpectator ? null : 'O';
    roomStatus.textContent = `Đã vào phòng ${roomId} ${asSpectator ? '(Spectator)' : '(Bạn là O)'}`;
    setupRoomListeners(roomId, asSpectator);
  });
}

/* push chat to room */
function sendChatToRoom(msg) {
  if (!firebaseEnabled || !roomId) { appendChatMessage({ name: playerNameInput.value||'You', msg }); return; }
  const chatRef = db.ref(`caro_rooms/${roomId}/chat`);
  chatRef.push({ name: playerNameInput.value || 'Guest', msg, t: Date.now() });
}

/* ========== Leaderboard writing & aggregation ========== */

/* push entry (simple event log), leaderboard will be aggregated client-side */
function pushLeaderboardEntry(entry) {
  if (!entry) return;
  const e = {
    winner: entry.winner || 'Unknown',
    reason: entry.reason || '',
    room: entry.room || '',
    t: Date.now()
  };
  // push to firebase leaderboard node (if enabled)
  if (firebaseEnabled) {
    const lbRef = db.ref('leaderboard');
    lbRef.push(e, (err) => {
      if (err) console.warn('Push leaderboard failed', err);
      else console.log('Leaderboard entry pushed');
      // after writing, refresh aggregate leaderboard view
      setTimeout(fetchAndRenderGlobalLeaderboard, 700);
    });
  } else {
    // offline: nothing to push; fallback local aggregation
    console.log('Leaderboard not pushed (firebase disabled)');
  }
}

/* fetch leaderboard events and aggregate top winners (counts) */
function fetchAndRenderGlobalLeaderboard() {
  if (!firebaseEnabled) {
    // show local as fallback
    loadLocalHistoryUI();
    return;
  }
  const lbRef = db.ref('leaderboard').limitToLast(5000);
  lbRef.once('value').then(snap => {
    const data = snap.val() || {};
    const counts = {};
    Object.values(data).forEach(it => {
      if (!it) return;
      const w = it.winner || 'Unknown';
      counts[w] = (counts[w] || 0) + 1;
    });
    const arr = Object.keys(counts).map(k => ({ name: k, wins: counts[k] }));
    arr.sort((a,b) => b.wins - a.wins);
    leaderList.innerHTML = '';
    arr.slice(0, 20).forEach(i => {
      const li = document.createElement('li');
      li.textContent = `${i.name}: ${i.wins} thắng`;
      leaderList.appendChild(li);
    });
  }).catch(err => {
    console.warn('fetch leaderboard failed', err);
    loadLocalHistoryUI();
  });
}

/* ========== AI (Cris Pro) ========== */

/*
 Strategy:
 1) If AI has immediate winning move -> play
 2) If opponent has immediate winning move -> block
 3) Evaluate each empty cell by heuristic patterns (open-4, open-3 etc.)
 4) Choose highest scoring move
 Additional: small random tie-break to avoid deterministic play
*/

function AI_findBestMove(bd, aiSymbol) {
  const opp = aiSymbol === 'X' ? 'O' : 'X';
  const candidates = [];

  // Only consider cells near existing stones
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (bd[r][c] !== null) continue;
      
      let near = false;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          let rr = r + dr, cc = c + dc;
          if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && bd[rr][cc] !== null) {
            near = true;
            break;
          }
        }
      }
      if (near) candidates.push({r, c});
    }
  }

  // If board empty → play center
  if (candidates.length === 0)
    return {r: Math.floor(ROWS/2), c: Math.floor(COLS/2)};

  let bestScore = -Infinity;
  let bestMove = candidates[0];

  for (const cell of candidates) {
    let {r, c} = cell;
    if (bd[r][c] !== null) continue;

    // 1) Try winning move
    bd[r][c] = aiSymbol;
    if (checkWinBoard(bd, r, c, aiSymbol)) {
      bd[r][c] = null;
      return {r,c}; // instant win
    }
    bd[r][c] = null;

    // 2) Try blocking opponent win
    bd[r][c] = opp;
    if (checkWinBoard(bd, r, c, opp)) {
      bd[r][c] = null;
      return {r,c}; // block immediately
    }
    bd[r][c] = null;

    // 3) Strategy scoring
    const score = evaluateCell_Strategy(bd, r, c, aiSymbol, opp);
    if (score > bestScore) {
      bestScore = score;
      bestMove = {r, c};
    }
  }

  return bestMove;
}

function evaluateCell_Strategy(bd, r, c, ai, opp) {
  let score = 0;

  score += patternScore(bd, r, c, ai) * 2;     // prioritize AI patterns
  score += patternScore(bd, r, c, opp) * 1.5;  // block opponent patterns

  // prefer center
  score += 50 - (Math.abs(r - ROWS/2) + Math.abs(c - COLS/2));

  return score;
}

function patternScore(bd, r, c, who) {
  let total = 0;
  bd[r][c] = who;

  // direct win
  if (checkWinBoard(bd, r, c, who)) total += 5000;

  // open sequences
  total += countOpenSequences(bd, r, c, who, 4) * 400;
  total += countOpenSequences(bd, r, c, who, 3) * 150;
  total += countOpenSequences(bd, r, c, who, 2) * 20;

  bd[r][c] = null;
  return total;
}

function countOpenSequences(bd, r, c, who, len) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  let count = 0;

  for (const d of dirs) {
    let seq = 1;
    let openStart = false, openEnd = false;

    // forward
    for (let i=1;i<=len;i++) {
      const rr = r + d[0]*i, cc = c + d[1]*i;
      if (rr<0||rr>=ROWS||cc<0||cc>=COLS) break;
      if (bd[rr][cc] === who) seq++;
      else if (bd[rr][cc] === null) { openEnd = true; break; }
      else break;
    }

    // backward
    for (let i=1;i<=len;i++) {
      const rr = r - d[0]*i, cc = c - d[1]*i;
      if (rr<0||rr>=ROWS||cc<0||cc>=COLS) break;
      if (bd[rr][cc] === who) seq++;
      else if (bd[rr][cc] === null) { openStart = true; break; }
      else break;
    }

    if (seq >= len && openStart && openEnd)
      count++;
  }

  return count;
}


/* attempt to reconnect to room state if disconnected */
function tryReconnectToRoom() {
  if (!firebaseEnabled || !roomId) return;
  const stateRef = db.ref(`caro_rooms/${roomId}/state`);
  stateRef.once('value').then(snap => {
    if (!snap.exists()) return;
    const st = snap.val();
    if (st.board && st.board.length === ROWS*COLS) {
      loadBoardFromFlat(st.board);
      updateCells();
      if (st.turn) { turn = st.turn; turnLabel.textContent = turn; }
    }
  }).catch(e => {
    console.warn('Reconnect failed', e);
  });
}

/* monitor connection and re-attach listeners on reconnect */
function monitorConnection() {
  if (!firebaseEnabled) return;
  const connectedRef = db.ref('.info/connected');
  connectedRef.on('value', snap => {
    if (snap.val() === true) {
      console.log('Firebase connected');
      // if in a room, reattach listeners
      if (roomId) {
        setupRoomListeners(roomId, isSpectator);
        // rebuild state once
        tryReconnectToRoom();
      }
    } else {
      console.log('Firebase disconnected');
      setStatus('Mất kết nối — sẽ tự reconnect khi mạng về');
    }
  });
}

/* ========== Initialization & wiring UI events ========== */

function startLocalOrAI() {
  mode = modeSelect.value;
  makeEmptyBoard();
  renderBoard();
  turn = 'X';
  turnLabel.textContent = turn;
  playing = true;
  isSpectator = false;
  roomId = null;
  isHost = false;
  mySymbol = 'X';
  setStatus(mode === 'ai' ? 'Chơi với Cris (AI). Bạn là X.' : 'Chơi local. X đi trước.');
  resetTimer();
}

/* start as per UI selection */
startBtn.addEventListener('click', () => {
  mode = modeSelect.value;
  if (mode === 'online') {
    onlineOptions.style.display = 'block';
    setStatus('Bật chế độ Online — tạo hoặc vào phòng');
  } else {
    onlineOptions.style.display = 'none';
    startLocalOrAI();
  }
});

/* reset */
resetBtn.addEventListener('click', () => {
  makeEmptyBoard();
  updateCells();
  playing = false;
  setStatus('Reset board');
  stopTimer();
});

/* create room click */
if (createRoomBtn) {
  createRoomBtn.addEventListener('click', () => {
    createRoom();
  });
}

/* join room click */
if (joinRoomBtn) {
  joinRoomBtn.addEventListener('click', () => {
    const id = roomInput.value.trim();
    joinRoom(id, false);
  });
}

/* spectate via start when mode= spectate and room entered */
modeSelect.addEventListener('change', () => {
  if (modeSelect.value === 'online') {
    onlineOptions.style.display = 'block';
  } else {
    onlineOptions.style.display = 'none';
  }
});

/* chat send */
sendChatBtn.addEventListener('click', () => {
  const msg = chatInput.value.trim();
  if (!msg) return;
  if (!roomId || !firebaseEnabled) {
    appendChatMessage({ name: playerNameInput.value || 'You', msg, t: Date.now() });
    chatInput.value = '';
    return;
  }
  sendChatToRoom(msg);
  chatInput.value = '';
});

/* keyboard shortcuts: space to start or click cell? We'll keep simple - space for start */
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (!playing) startBtn.click();
  }
});

/* ========== boot sequence ========== */
function boot() {
  makeEmptyBoard();
  renderBoard();
  loadLocalHistoryUI();
  if (firebaseEnabled) {
    monitorConnection();
    fetchAndRenderGlobalLeaderboard();
  } else {
    setStatus('Offline mode (Firebase not configured).');
  }
  // If URL contains ?room=xxx and mode=online or spectate -> auto join
  const params = new URLSearchParams(window.location.search);
  const r = params.get('room');
  const m = params.get('mode');
  if (r) {
    if (m === 'spectate') {
      joinRoom(r, true);
    } else {
      joinRoom(r, false);
    }
  }
}
boot();

/* ========== Utility: check board full (draw) ========== */
function boardIsFull() {
  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) if (!board[r][c]) return false;
  return true;
}

/* ========== END of file ========== */

