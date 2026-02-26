/**
 * 지뢰찾기 게임 로직
 * 1단계: 10x10, 폭탄 3개
 * 2단계: 20x20, 폭탄 5개
 * 3단계: 30x30, 폭탄 10개
 */

const LEVELS = {
  1: { rows: 10, cols: 10, bombs: 3 },
  2: { rows: 20, cols: 20, bombs: 5 },
  3: { rows: 30, cols: 30, bombs: 10 }
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
    alert("축하합니다! 승리했습니다!");
  }
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

document.addEventListener("DOMContentLoaded", () => {
  startGame(1);

  document.querySelectorAll(".level-buttons .btn").forEach(btn => {
    btn.addEventListener("click", () => {
      startGame(parseInt(btn.dataset.level, 10));
    });
  });

  document.getElementById("restartBtn")?.addEventListener("click", () => {
    startGame(state.level);
  });
});
