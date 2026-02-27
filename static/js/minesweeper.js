/**
 * 지뢰찾기 게임 로직
 * 1단계: 10x10, 폭탄 10개
 * 2단계: 20x20, 폭탄 20개
 * 3단계: 30x30, 폭탄 30개
 */

const LEVELS = {
  1: { rows: 10, cols: 10, bombs: 10 },
  2: { rows: 20, cols: 20, bombs: 20 },
  3: { rows: 30, cols: 30, bombs: 30 }
};

const DIRS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1]
];

const LONG_PRESS_MS = 500;

let touchState = {
  startTime: 0,
  targetCell: null,
  justHandled: null
};

let state = {
  level: 1,
  rows: 10,
  cols: 10,
  bombCount: 3,
  grid: [],           // 2D: true=폭탄
  revealed: [],       // 2D: true=열림
  flagged: [],        // 2D: true=플래그
  firstClick: true,
  gameOver: false,
  won: false,
  bombHitRow: -1,
  bombHitCol: -1
};

function getConfig() {
  const cfg = LEVELS[state.level] || LEVELS[1];
  return { rows: cfg.rows, cols: cfg.cols, bombs: cfg.bombs };
}

function isInBounds(r, c) {
  return r >= 0 && r < state.rows && c >= 0 && c < state.cols;
}

function placeBombs(firstRow, firstCol) {
  const exclude = new Set();
  for (const [dr, dc] of DIRS) {
    exclude.add(`${firstRow + dr},${firstCol + dc}`);
  }
  exclude.add(`${firstRow},${firstCol}`);

  let placed = 0;
  const total = state.rows * state.cols;
  while (placed < state.bombCount) {
    const r = Math.floor(Math.random() * state.rows);
    const c = Math.floor(Math.random() * state.cols);
    const key = `${r},${c}`;
    if (!exclude.has(key) && !state.grid[r][c]) {
      state.grid[r][c] = true;
      placed++;
    }
  }
}

function getAdjacentBombCount(row, col) {
  let count = 0;
  for (const [dr, dc] of DIRS) {
    const r = row + dr, c = col + dc;
    if (isInBounds(r, c) && state.grid[r][c]) count++;
  }
  return count;
}

function renderCell(r, c) {
  const cell = document.createElement("div");
  cell.className = "cell closed";
  cell.dataset.row = r;
  cell.dataset.col = c;

  cell.addEventListener("touchstart", () => {
    touchState.startTime = Date.now();
    touchState.targetCell = { r, c };
  }, { passive: true });

  cell.addEventListener("touchend", (e) => {
    if (touchState.targetCell && touchState.targetCell.r === r && touchState.targetCell.c === c) {
      const duration = Date.now() - touchState.startTime;
      if (duration >= LONG_PRESS_MS) {
        e.preventDefault();
        toggleFlag(r, c);
      } else {
        onCellClick(r, c);
      }
      touchState.justHandled = { r, c, time: Date.now() };
      touchState.targetCell = null;
      setTimeout(() => { touchState.justHandled = null; }, 400);
    }
  }, { passive: false });

  cell.addEventListener("touchcancel", () => {
    touchState.targetCell = null;
  });

  cell.addEventListener("click", (e) => {
    if (touchState.justHandled && touchState.justHandled.r === r && touchState.justHandled.c === c &&
        (Date.now() - touchState.justHandled.time) < 400) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onCellClick(r, c);
  });

  cell.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    toggleFlag(r, c);
  });

  return cell;
}

function updateCellUI(r, c) {
  const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
  if (!cell) return;

  cell.className = "cell";
  if (state.flagged[r][c] && !state.revealed[r][c]) {
    cell.classList.add("flagged");
    cell.textContent = "🚩";
  } else if (state.revealed[r][c]) {
    cell.classList.add("revealed");
    if (state.grid[r][c]) {
      const isHit = state.gameOver && !state.won && r === state.bombHitRow && c === state.bombHitCol;
      cell.classList.add(isHit ? "bomb-hit" : "bomb");
      cell.textContent = "💣";
    } else {
      const count = getAdjacentBombCount(r, c);
      cell.classList.add("num-" + count);
      cell.textContent = count > 0 ? count : "";
    }
  } else {
    cell.classList.add("closed");
    cell.textContent = "";
  }
}

function reveal(row, col) {
  if (!isInBounds(row, col) || state.revealed[row][col] || state.flagged[row][col] || state.gameOver) return;

  if (state.firstClick) {
    state.firstClick = false;
    placeBombs(row, col);
  }

  if (state.grid[row][col]) {
    state.gameOver = true;
    state.won = false;
    state.bombHitRow = row;
    state.bombHitCol = col;
    revealAllBombs();
    updateCellUI(row, col);
    alert("게임 오버! 폭탄을 밟았습니다.");
    return;
  }

  state.revealed[row][col] = true;
  updateCellUI(row, col);

  const count = getAdjacentBombCount(row, col);
  if (count === 0) {
    for (const [dr, dc] of DIRS) {
      reveal(row + dr, col + dc);
    }
  }

  checkWin();
}

function revealAllBombs() {
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      if (state.grid[r][c]) {
        state.revealed[r][c] = true;
        updateCellUI(r, c);
      }
    }
  }
}

function toggleFlag(row, col) {
  if (state.gameOver || state.revealed[row][col]) return;
  state.flagged[row][col] = !state.flagged[row][col];
  updateCellUI(row, col);
  updateBombCountDisplay();
}

function onCellClick(row, col) {
  if (state.gameOver) return;
  reveal(row, col);
}

function checkWin() {
  if (state.gameOver) return;
  const safeCount = state.rows * state.cols - state.bombCount;
  let revealedCount = 0;
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      if (state.revealed[r][c] && !state.grid[r][c]) revealedCount++;
    }
  }
  if (revealedCount === safeCount) {
    state.gameOver = true;
    state.won = true;
    revealAllBombs();
    saveMinesweeperRecord(state.level, function() {
      if (typeof loadRanking === "function") loadRanking();
    });
    alert("축하합니다! 승리했습니다!");
  }
}

function saveMinesweeperRecord(level, onDone) {
  fetch("/api/minesweeper/record", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ level: level })
  })
    .then(function() { if (onDone) onDone(); })
    .catch(function() { if (onDone) onDone(); });
}

function loadRanking() {
  const tbody = document.getElementById("rankingBody");
  if (!tbody) return;
  fetch("/api/minesweeper/ranking", { credentials: "include" })
    .then(function(r) {
      return r.text().then(function(t) {
        try {
          return t ? JSON.parse(t) : {};
        } catch (_) {
          return {};
        }
      });
    })
    .then(function(data) {
      const list = Array.isArray(data.ranking) ? data.ranking : [];
      if (list.length === 0) {
        tbody.innerHTML = "<tr><td colspan=\"4\" class=\"text-muted text-center\">기록이 없습니다.</td></tr>";
      } else {
        tbody.innerHTML = list.map(function(r) {
          var rank = Number(r.rank) || 0;
          var level = Number(r.level) || 1;
          var username = escapeHtmlRank(r.username != null ? String(r.username) : "");
          var date = r.success_date != null ? String(r.success_date) : "";
          return "<tr><td>" + rank + "</td><td>" + level + "단계</td><td>" + username + "</td><td>" + date + "</td></tr>";
        }).join("");
      }
    })
    .catch(function() {
      tbody.innerHTML = "<tr><td colspan=\"4\" class=\"text-muted text-center\">로드 실패</td></tr>";
    });
}

function escapeHtmlRank(s) {
  if (s == null || s === undefined) return "";
  var div = document.createElement("div");
  div.textContent = String(s);
  return div.innerHTML;
}

function updateBombCountDisplay() {
  let flags = 0;
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      if (state.flagged[r][c]) flags++;
    }
  }
  const el = document.getElementById("bombCount");
  if (el) el.textContent = `폭탄: ${state.bombCount - flags}`;
}

function buildBoard() {
  const board = document.getElementById("minesweeper-board");
  if (!board) return;

  board.innerHTML = "";
  board.style.gridTemplateColumns = `repeat(${state.cols}, 1fr)`;
  board.style.gridTemplateRows = `repeat(${state.rows}, 1fr)`;
  board.className = "minesweeper-board level-" + state.level;

  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      board.appendChild(renderCell(r, c));
    }
  }
}

function startGame(level) {
  const cfg = LEVELS[level] || LEVELS[1];
  state = {
    level,
    rows: cfg.rows,
    cols: cfg.cols,
    bombCount: cfg.bombs,
    grid: Array(cfg.rows).fill(null).map(() => Array(cfg.cols).fill(false)),
    revealed: Array(cfg.rows).fill(null).map(() => Array(cfg.cols).fill(false)),
    flagged: Array(cfg.rows).fill(null).map(() => Array(cfg.cols).fill(false)),
    firstClick: true,
    gameOver: false,
    won: false,
    bombHitRow: -1,
    bombHitCol: -1
  };

  document.querySelectorAll(".level-buttons .btn").forEach(btn => {
    btn.classList.toggle("active", parseInt(btn.dataset.level, 10) === level);
  });

  updateBombCountDisplay();
  buildBoard();
}

document.addEventListener("DOMContentLoaded", function() {
  startGame(1);
  loadRanking();

  document.querySelectorAll(".level-buttons .btn").forEach(function(btn) {
    btn.addEventListener("click", function() {
      startGame(parseInt(btn.dataset.level, 10));
    });
  });

  var restartBtn = document.getElementById("restartBtn");
  if (restartBtn) restartBtn.addEventListener("click", function() {
    startGame(state.level);
  });
});
