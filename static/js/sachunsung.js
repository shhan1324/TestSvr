/**
 * 사천성 게임 로직
 * 1단계 30쌍 ~ 5단계 250쌍. 같은 그림 두 개를 최대 2번 꺾인 선으로 연결하면 제거.
 */
(function() {
  "use strict";

  var STAGES = {
    1: { pairs: 30,  rows: 6,  cols: 10 },
    2: { pairs: 85,  rows: 10, cols: 17 },
    3: { pairs: 140, rows: 14, cols: 20 },
    4: { pairs: 195, rows: 15, cols: 26 },
    5: { pairs: 250, rows: 20, cols: 25 }
  };

  var state = {
    stage: 1,
    rows: 6,
    cols: 10,
    pairs: 30,
    board: [],      // 2D: 0 = empty, 1..N = tile type (pair id)
    selected: null, // { r, c, type } or null
    gameStarted: false,
    gameOver: false,
    startTime: 0,
    timerId: null
  };

  function getConfig() {
    var cfg = STAGES[state.stage] || STAGES[1];
    return { pairs: cfg.pairs, rows: cfg.rows, cols: cfg.cols };
  }

  function isInBounds(r, c) {
    return r >= 0 && r < state.rows && c >= 0 && c < state.cols;
  }

  function isEmpty(r, c) {
    return isInBounds(r, c) && state.board[r][c] === 0;
  }

  function getType(r, c) {
    return isInBounds(r, c) ? state.board[r][c] : 0;
  }

  function pathClearRowExcludeEnds(r, cFrom, cTo) {
    var lo = Math.min(cFrom, cTo) + 1;
    var hi = Math.max(cFrom, cTo) - 1;
    for (var c = lo; c <= hi; c++) {
      if (!isEmpty(r, c)) return false;
    }
    return true;
  }
  function pathClearColExcludeEnds(c, rFrom, rTo) {
    var lo = Math.min(rFrom, rTo) + 1;
    var hi = Math.max(rFrom, rTo) - 1;
    for (var r = lo; r <= hi; r++) {
      if (!isEmpty(r, c)) return false;
    }
    return true;
  }

  /** 같은 행/열 직선 연결 (0번 꺾임) */
  function canConnect0(r1, c1, r2, c2) {
    if (r1 === r2) {
      return pathClearRowExcludeEnds(r1, c1, c2);
    }
    if (c1 === c2) {
      return pathClearColExcludeEnds(c1, r1, r2);
    }
    return false;
  }

  /** 1번 꺾임: (r1,c1)->(r1,c2)->(r2,c2) 또는 (r1,c1)->(r2,c1)->(r2,c2) */
  function canConnect1(r1, c1, r2, c2) {
    if (r1 === r2 && c1 === c2) return false;
    var corner1r = r1, corner1c = c2;
    if (isEmpty(corner1r, corner1c) && pathClearRowExcludeEnds(r1, c1, c2) && pathClearColExcludeEnds(c2, r1, r2))
      return true;
    corner1r = r2; corner1c = c1;
    if (isEmpty(corner1r, corner1c) && pathClearColExcludeEnds(c1, r1, r2) && pathClearRowExcludeEnds(r2, c1, c2))
      return true;
    return false;
  }

  /** 2번 꺾임: (r1,c1)->(r1,c')->(r2,c')->(r2,c2) for some c' */
  function canConnect2(r1, c1, r2, c2) {
    for (var c = 0; c < state.cols; c++) {
      if (c === c1 || c === c2) continue;
      var midR = r1, midC = c;
      if (!isEmpty(midR, midC)) continue;
      var midR2 = r2, midC2 = c;
      if (!isEmpty(midR2, midC2)) continue;
      if (!pathClearRowExcludeEnds(r1, c1, c)) continue;
      if (!pathClearColExcludeEnds(c, r1, r2)) continue;
      if (!pathClearRowExcludeEnds(r2, c, c2)) continue;
      return true;
    }
    for (var r = 0; r < state.rows; r++) {
      if (r === r1 || r === r2) continue;
      if (!isEmpty(r, c1)) continue;
      if (!isEmpty(r, c2)) continue;
      if (!pathClearColExcludeEnds(c1, r1, r)) continue;
      if (!pathClearRowExcludeEnds(r, c1, c2)) continue;
      if (!pathClearColExcludeEnds(c2, r, r2)) continue;
      return true;
    }
    return false;
  }

  function canConnect(r1, c1, r2, c2) {
    var t1 = getType(r1, c1);
    var t2 = getType(r2, c2);
    if (t1 === 0 || t2 === 0 || t1 !== t2) return false;
    if (r1 === r2 && c1 === c2) return false;
    if (canConnect0(r1, c1, r2, c2)) return true;
    if (canConnect1(r1, c1, r2, c2)) return true;
    if (canConnect2(r1, c1, r2, c2)) return true;
    return false;
  }

  function initBoard() {
    var cfg = getConfig();
    state.rows = cfg.rows;
    state.cols = cfg.cols;
    state.pairs = cfg.pairs;
    state.board = [];
    var r, c;
    for (r = 0; r < state.rows; r++) {
      state.board[r] = [];
      for (c = 0; c < state.cols; c++) state.board[r][c] = 0;
    }
    var total = state.pairs * 2;
    var positions = [];
    for (r = 0; r < state.rows; r++) {
      for (c = 0; c < state.cols; c++) positions.push({ r: r, c: c });
    }
    for (var i = positions.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = positions[i]; positions[i] = positions[j]; positions[j] = t;
    }
    for (var p = 0; p < state.pairs; p++) {
      var type = p + 1;
      state.board[positions[p * 2].r][positions[p * 2].c] = type;
      state.board[positions[p * 2 + 1].r][positions[p * 2 + 1].c] = type;
    }
  }

  function startTimer() {
    if (state.timerId) return;
    state.startTime = Date.now();
    state.timerId = setInterval(updateTimerDisplay, 100);
    updateTimerDisplay();
  }

  function stopTimer() {
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function getElapsedSec() {
    if (!state.startTime) return 0;
    return (Date.now() - state.startTime) / 1000;
  }

  function updateTimerDisplay() {
    var el = document.getElementById("timerDisplay");
    if (!el) return;
    var sec = getElapsedSec();
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    var tenth = Math.floor((sec * 10) % 10);
    el.textContent = (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s + "." + tenth;
  }

  function renderBoard() {
    var boardEl = document.getElementById("sachunsung-board");
    if (!boardEl) return;
    boardEl.innerHTML = "";
    boardEl.className = "sachunsung-board cols-" + state.cols;
    var r, c;
    for (r = 0; r < state.rows; r++) {
      for (c = 0; c < state.cols; c++) {
        var cell = document.createElement("div");
        cell.className = "sachunsung-cell";
        cell.dataset.row = r;
        cell.dataset.col = c;
        var type = state.board[r][c];
        if (type === 0) {
          cell.classList.add("empty");
        } else {
          cell.classList.add("tile");
          cell.dataset.type = type;
          cell.textContent = type % 8 || 8;
          cell.addEventListener("click", (function(rr, cc) {
            return function() { onTileClick(rr, cc); };
          })(r, c));
        }
        boardEl.appendChild(cell);
      }
    }
  }

  function updateSelectionUI() {
    var tiles = document.querySelectorAll(".sachunsung-cell.tile");
    for (var i = 0; i < tiles.length; i++) {
      var t = tiles[i];
      var r = parseInt(t.dataset.row, 10);
      var c = parseInt(t.dataset.col, 10);
      if (state.selected && state.selected.r === r && state.selected.c === c) {
        t.classList.add("selected");
      } else {
        t.classList.remove("selected");
      }
    }
  }

  function onTileClick(r, c) {
    if (state.gameOver) return;
    var type = getType(r, c);
    if (type === 0) return;
    if (!state.gameStarted) {
      state.gameStarted = true;
      startTimer();
      var startBtn = document.getElementById("startBtn");
      var restartBtn = document.getElementById("restartBtn");
      if (startBtn) startBtn.style.display = "none";
      if (restartBtn) restartBtn.style.display = "";
    }
    if (state.selected === null) {
      state.selected = { r: r, c: c, type: type };
      updateSelectionUI();
      return;
    }
    if (state.selected.r === r && state.selected.c === c) {
      state.selected = null;
      updateSelectionUI();
      return;
    }
    if (state.selected.type !== type) {
      state.selected = { r: r, c: c, type: type };
      updateSelectionUI();
      return;
    }
    if (!canConnect(state.selected.r, state.selected.c, r, c)) {
      state.selected = { r: r, c: c, type: type };
      updateSelectionUI();
      return;
    }
    removePair(state.selected.r, state.selected.c, r, c);
    state.selected = null;
    updateSelectionUI();
  }

  function removePair(r1, c1, r2, c2) {
    var cell1 = document.querySelector(".sachunsung-cell[data-row=\"" + r1 + "\"][data-col=\"" + c1 + "\"]");
    var cell2 = document.querySelector(".sachunsung-cell[data-row=\"" + r2 + "\"][data-col=\"" + c2 + "\"]");
    if (cell1) cell1.classList.add("removing");
    if (cell2) cell2.classList.add("removing");
    setTimeout(function() {
      state.board[r1][c1] = 0;
      state.board[r2][c2] = 0;
      if (cell1) {
        cell1.classList.remove("tile", "selected", "removing");
        cell1.classList.add("empty");
        cell1.textContent = "";
        cell1.removeAttribute("data-type");
        cell1.replaceWith(cell1.cloneNode(true));
      }
      if (cell2) {
        cell2.classList.remove("tile", "selected", "removing");
        cell2.classList.add("empty");
        cell2.textContent = "";
        cell2.removeAttribute("data-type");
        cell2.replaceWith(cell2.cloneNode(true));
      }
      checkWin();
    }, 200);
  }

  function checkWin() {
    var left = 0;
    for (var r = 0; r < state.rows; r++) {
      for (var c = 0; c < state.cols; c++) {
        if (state.board[r][c] !== 0) left++;
      }
    }
    if (left === 0) {
      state.gameOver = true;
      stopTimer();
      var sec = getElapsedSec();
      setTimeout(function() {
        alert("클리어! 소요 시간: " + formatTime(sec));
        saveRecord(sec);
        loadRanking();
      }, 250);
    }
  }

  function formatTime(sec) {
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    var tenth = Math.floor((sec * 10) % 10);
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s + "." + tenth;
  }

  function saveRecord(clearTimeSec) {
    fetch("/api/sachunsung/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ stage: state.stage, clear_time_sec: clearTimeSec })
    }).catch(function() {});
  }

  function loadRanking() {
    var tbody = document.getElementById("rankingBody");
    if (!tbody) return;
    fetch("/api/sachunsung/ranking", { credentials: "include" })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var list = Array.isArray(data.ranking) ? data.ranking : [];
        if (list.length === 0) {
          tbody.innerHTML = "<tr><td colspan=\"5\" class=\"text-muted text-center\">기록이 없습니다.</td></tr>";
        } else {
          tbody.innerHTML = list.map(function(row) {
            var rank = row.rank || 0;
            var stage = row.stage || 1;
            var username = escapeHtml(String(row.username || ""));
            var timeStr = row.clear_time_sec != null ? formatTime(Number(row.clear_time_sec)) : "-";
            var regDate = row.reg_date != null ? String(row.reg_date) : "";
            return "<tr><td>" + rank + "</td><td>" + stage + "단계</td><td>" + username + "</td><td>" + timeStr + "</td><td>" + regDate + "</td></tr>";
          }).join("");
        }
      })
      .catch(function() {
        tbody.innerHTML = "<tr><td colspan=\"5\" class=\"text-muted text-center\">로드 실패</td></tr>";
      });
  }

  function escapeHtml(s) {
    if (s == null) return "";
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function startGame() {
    state.gameStarted = false;
    state.gameOver = false;
    state.selected = null;
    stopTimer();
    document.getElementById("timerDisplay").textContent = "00:00.0";
    document.getElementById("startBtn").style.display = "";
    document.getElementById("restartBtn").style.display = "none";
    initBoard();
    renderBoard();
  }

  function setStage(stage) {
    if (state.gameStarted && !state.gameOver) return;
    state.stage = stage;
    var cfg = getConfig();
    state.rows = cfg.rows;
    state.cols = cfg.cols;
    state.pairs = cfg.pairs;
    document.querySelectorAll(".stage-buttons .btn").forEach(function(btn) {
      btn.classList.toggle("active", parseInt(btn.dataset.stage, 10) === stage);
    });
    startGame();
  }

  document.addEventListener("DOMContentLoaded", function() {
    loadRanking();
    setStage(1);

    document.querySelectorAll(".stage-buttons .btn").forEach(function(btn) {
      btn.addEventListener("click", function() {
        setStage(parseInt(btn.dataset.stage, 10));
      });
    });
    document.getElementById("startBtn").addEventListener("click", function() {
      if (!state.gameStarted) {
        state.gameStarted = true;
        startTimer();
        document.getElementById("startBtn").style.display = "none";
        document.getElementById("restartBtn").style.display = "";
      }
    });
    document.getElementById("restartBtn").addEventListener("click", startGame);
  });
})();
