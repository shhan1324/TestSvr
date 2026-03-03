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

  var TILE_EMOJIS = [
    "\uD83D\uDC36","\uD83D\uDC31","\uD83D\uDC2D","\uD83D\uDC39","\uD83D\uDC30","\uD83E\uDD8A","\uD83D\uDC3B","\uD83D\uDC3C","\uD83D\uDC28","\uD83D\uDC3A",
    "\uD83D\uDC2F","\uD83D\uDC2E","\uD83D\uDC37","\uD83D\uDC38","\uD83D\uDC35","\uD83D\uDC12","\uD83D\uDC14","\uD83D\uDC17","\uD83D\uDC26","\uD83D\uDC24",
    "\uD83E\uDD85","\uD83E\uDD86","\uD83E\uDD84","\uD83E\uDD83","\uD83E\uDD81","\uD83E\uDD82","\uD83E\uDD80","\uD83E\uDD8F","\uD83E\uDD87","\uD83E\uDD89",
    "\uD83D\uDC1F","\uD83D\uDC1B","\uD83E\uDD8B","\uD83D\uDC1C","\uD83D\uDC1D","\uD83D\uDC1E","\uD83E\uDD90","\uD83E\uDD91","\uD83E\uDD92","\uD83E\uDD93",
    "\uD83D\uDC22","\uD83D\uDC0D","\uD83E\uDD8E","\uD83D\uDC0E","\uD83E\uDD96","\uD83E\uDD95","\uD83E\uDD99","\uD83E\uDD97","\uD83E\uDD98","\uD83E\uDD9A",
    "\uD83D\uDC20","\uD83D\uDC1A","\uD83D\uDC19","\uD83D\uDC2A","\uD83D\uDC2B","\uD83D\uDC21","\uD83D\uDC34","\uD83D\uDC33","\uD83D\uDC2C","\uD83D\uDC3E",
    "\uD83C\uDF4E","\uD83C\uDF50","\uD83C\uDF4A","\uD83C\uDF4B","\uD83C\uDF4C","\uD83C\uDF49","\uD83C\uDF47","\uD83C\uDF53","\uD83C\uDF48","\uD83C\uDF4F",
    "\uD83C\uDF51","\uD83C\uDF52","\uD83C\uDF46","\uD83C\uDF45","\uD83C\uDF3D","\uD83E\uDD5C","\uD83E\uDD5D","\uD83C\uDF36","\uD83E\uDD55","\uD83E\uDD54",
    "\uD83C\uDF5A","\uD83C\uDF5B","\uD83C\uDF5C","\uD83C\uDF5D","\uD83E\uDD58","\uD83C\uDF5E","\uD83E\uDD56","\uD83E\uDD57","\uD83E\uDD59","\uD83C\uDF5F",
    "\uD83C\uDF60","\uD83C\uDF62","\uD83C\uDF63","\uD83C\uDF64","\uD83C\uDF65","\uD83C\uDF66","\uD83C\uDF67","\uD83C\uDF68","\uD83C\uDF69","\uD83C\uDF6A",
    "\uD83C\uDF6B","\uD83C\uDF6C","\uD83C\uDF6D","\uD83C\uDF6E","\uD83C\uDF6F","\uD83E\uDD65","\uD83E\uDD66","\uD83E\uDD67","\uD83E\uDD68","\uD83E\uDD69",
    "\uD83C\uDF7F","\uD83C\uDF80","\uD83C\uDF81","\uD83C\uDF82","\uD83C\uDF83","\uD83C\uDF84","\uD83C\uDF85","\uD83C\uDF86","\uD83C\uDF87","\uD83C\uDF88",
    "\uD83C\uDF89","\uD83C\uDF8A","\uD83C\uDF8B","\uD83C\uDF8C","\uD83C\uDF8D","\uD83C\uDF8E","\uD83C\uDF8F","\uD83C\uDF90","\uD83C\uDF91","\uD83C\uDF92",
    "\uD83C\uDF93","\uD83C\uDF96","\uD83C\uDF97","\uD83C\uDF99","\uD83C\uDF9A","\uD83C\uDF9B","\uD83C\uDF9E","\uD83C\uDF9F","\uD83C\uDFA0","\uD83C\uDFA1",
    "\uD83C\uDFA2","\uD83C\uDFA3","\uD83C\uDFA4","\uD83C\uDFA5","\uD83C\uDFA6","\uD83C\uDFA7","\uD83C\uDFA8","\uD83C\uDFA9","\uD83C\uDFAB","\uD83C\uDFAC",
    "\uD83C\uDFAF","\uD83C\uDFB0","\uD83C\uDFB1","\uD83C\uDFB2","\uD83C\uDFB3","\uD83C\uDFB4","\uD83C\uDFB5","\uD83C\uDFB6","\uD83C\uDFB7","\uD83C\uDFB8",
    "\uD83C\uDFB9","\uD83C\uDFBA","\uD83C\uDFBB","\uD83C\uDFBC","\uD83E\uDD41","\uD83C\uDFBE","\uD83C\uDFBF","\uD83C\uDFC0","\uD83C\uDFC1","\uD83C\uDFC2",
    "\uD83C\uDFC3","\uD83C\uDFC4","\uD83C\uDFC6","\uD83C\uDFC8","\uD83C\uDFCA","\uD83E\uDD38","\uD83E\uDD39","\uD83E\uDD3A","\uD83E\uDD3B","\uD83E\uDD3C",
    "\uD83E\uDD3D","\uD83E\uDD3E","\uD83E\uDD3F","\uD83E\uDD40","\uD83E\uDD47","\uD83E\uDD48","\uD83E\uDD49","\uD83E\uDD4A","\uD83E\uDD4B","\uD83E\uDD4C",
    "\uD83C\uDFC9","\uD83C\uDFCA","\uD83C\uDFCB","\uD83C\uDFCC","\uD83E\uDD3C","\uD83E\uDD4D","\uD83E\uDD4E","\uD83E\uDD4F","\uD83E\uDD50","\uD83E\uDD51",
    "\uD83C\uDFCF","\uD83C\uDFD0","\uD83C\uDFD1","\uD83C\uDFD2","\uD83C\uDFD3","\uD83C\uDFD4","\uD83C\uDFD5","\uD83E\uDD45","\uD83E\uDD46","\uD83E\uDD44",
    "\uD83C\uDFE0","\uD83C\uDFE1","\uD83C\uDFE2","\uD83C\uDFE3","\uD83C\uDFE4","\uD83C\uDFE5","\uD83C\uDFE6","\uD83C\uDFE7","\uD83C\uDFE8","\uD83C\uDFE9",
    "\uD83C\uDFEA","\uD83C\uDFEB","\uD83C\uDFEC","\uD83C\uDFED","\uD83C\uDFEE","\uD83C\uDFEF","\uD83C\uDFF0","\uD83C\uDFD7","\uD83C\uDFD8","\uD83C\uDFD9",
    "\uD83C\uDFDA","\uD83C\uDFDB","\uD83C\uDFDC","\uD83C\uDFDD","\uD83C\uDFDE","\uD83C\uDFDF","\uD83C\uDFE0","\u26EA","\uD83D\uDDFC","\uD83D\uDDFB",
    "\uD83C\uDF04","\uD83C\uDF05","\uD83C\uDF06","\uD83C\uDF07","\uD83C\uDF08","\uD83C\uDF09","\uD83C\uDF0A","\uD83C\uDF0B","\uD83C\uDF0C","\uD83C\uDF0D",
    "\uD83C\uDF0E","\uD83C\uDF0F","\uD83C\uDF10","\uD83C\uDF11","\uD83C\uDF12","\uD83C\uDF13","\uD83C\uDF14","\uD83C\uDF15","\uD83C\uDF16","\uD83C\uDF17",
    "\uD83C\uDF18","\uD83C\uDF19","\uD83C\uDF1A","\uD83C\uDF1B","\uD83C\uDF1C","\uD83C\uDF1D","\uD83C\uDF1E","\uD83C\uDF1F","\uD83C\uDF20","\uD83C\uDF21",
    "\u26C5","\u26C8","\uD83C\uDF24","\uD83C\uDF25","\uD83C\uDF26","\uD83C\uDF27","\uD83C\uDF28","\uD83C\uDF29","\uD83C\uDF2A","\uD83C\uDF2B",
    "\uD83C\uDF2C","\uD83C\uDF2D","\uD83C\uDF2E","\uD83C\uDF2F","\uD83C\uDF30","\uD83C\uDF31","\uD83C\uDF32","\uD83C\uDF33","\uD83C\uDF34","\uD83C\uDF35",
    "\uD83C\uDF37","\uD83C\uDF38","\uD83C\uDF39","\uD83C\uDF3A","\uD83C\uDF3B","\uD83C\uDF3C","\uD83C\uDF3E","\uD83C\uDF3F","\uD83C\uDF40","\uD83C\uDF41",
    "\uD83C\uDF42","\uD83C\uDF43","\uD83C\uDF44","\uD83C\uDF45","\uD83C\uDF46","\uD83C\uDF47","\uD83C\uDF48","\uD83C\uDF49","\uD83C\uDF4A","\uD83C\uDF4B",
    "\uD83C\uDF4C","\uD83C\uDF4D","\uD83C\uDF4E","\uD83C\uDF4F","\uD83C\uDF50","\uD83C\uDF51","\uD83C\uDF52","\uD83C\uDF53","\uD83C\uDF54","\uD83C\uDF55",
    "\uD83C\uDF56","\uD83C\uDF57","\uD83C\uDF58","\uD83C\uDF59","\uD83C\uDF5A","\uD83C\uDF5B","\uD83C\uDF5C","\uD83C\uDF5D","\uD83C\uDF5E","\uD83C\uDF5F",
    "\uD83C\uDF60","\uD83C\uDF61","\uD83C\uDF62","\uD83C\uDF63","\uD83C\uDF64","\uD83C\uDF65","\uD83C\uDF66","\uD83C\uDF67","\uD83C\uDF68","\uD83C\uDF69",
    "\uD83C\uDF6A","\uD83C\uDF6B","\uD83C\uDF6C","\uD83C\uDF6D","\uD83C\uDF6E","\uD83C\uDF6F","\uD83C\uDF70","\uD83C\uDF71","\uD83C\uDF72","\uD83C\uDF73",
    "\uD83C\uDF74","\uD83C\uDF75","\uD83C\uDF76","\uD83C\uDF77","\uD83C\uDF78","\uD83C\uDF79","\uD83C\uDF7A","\uD83C\uDF7B","\uD83C\uDF7C","\uD83C\uDF7D",
    "\uD83C\uDF7E","\uD83C\uDF7F","\uD83C\uDF80","\uD83C\uDF81","\uD83C\uDF82","\uD83C\uDF83","\uD83C\uDF84","\uD83C\uDF85","\uD83C\uDF86","\uD83C\uDF87",
    "\uD83C\uDF88","\uD83C\uDF89","\uD83C\uDF8A","\uD83C\uDF8B","\uD83C\uDF8C","\uD83C\uDF8D","\uD83C\uDF8E","\uD83C\uDF8F","\uD83C\uDF90","\uD83C\uDF91",
    "\uD83C\uDF92","\uD83C\uDF93","\uD83C\uDF94","\uD83C\uDF95","\uD83C\uDF96","\uD83C\uDF97","\uD83C\uDF98","\uD83C\uDF99","\uD83C\uDF9A","\uD83C\uDF9B",
    "\uD83C\uDF9C","\uD83C\uDF9D","\uD83C\uDF9E","\uD83C\uDF9F","\uD83C\uDFA0","\uD83C\uDFA1","\uD83C\uDFA2","\uD83C\uDFA3","\uD83C\uDFA4","\uD83C\uDFA5",
    "\uD83C\uDFA6","\uD83C\uDFA7","\uD83C\uDFA8","\uD83C\uDFA9","\uD83C\uDFAA","\uD83C\uDFAB","\uD83C\uDFAC","\uD83C\uDFAD","\uD83C\uDFAE","\uD83C\uDFAF",
    "\uD83C\uDFB0","\uD83C\uDFB1","\uD83C\uDFB2","\uD83C\uDFB3","\uD83C\uDFB4","\uD83C\uDFB5","\uD83C\uDFB6","\uD83C\uDFB7","\uD83C\uDFB8","\uD83C\uDFB9",
    "\uD83C\uDFBA","\uD83C\uDFBB","\uD83C\uDFBC","\uD83C\uDFBD","\uD83C\uDFBE","\uD83C\uDFBF","\uD83C\uDFC0","\uD83C\uDFC1","\uD83C\uDFC2","\uD83C\uDFC3",
    "\uD83C\uDFC4","\uD83C\uDFC5","\uD83C\uDFC6","\uD83C\uDFC7","\uD83C\uDFC8","\uD83C\uDFC9","\uD83C\uDFCA","\uD83C\uDFCB","\uD83C\uDFCC","\uD83C\uDFCD",
    "\uD83C\uDFCE","\uD83C\uDFCF","\uD83C\uDFD0","\uD83C\uDFD1","\uD83C\uDFD2","\uD83C\uDFD3","\uD83C\uDFD4","\uD83C\uDFD5","\uD83C\uDFD6","\uD83C\uDFD7",
    "\uD83C\uDFD8","\uD83C\uDFD9","\uD83C\uDFDA","\uD83C\uDFDB","\uD83C\uDFDC","\uD83C\uDFDD","\uD83C\uDFDE","\uD83C\uDFDF","\uD83C\uDFE0","\uD83C\uDFE1",
    "\uD83C\uDFE2","\uD83C\uDFE3","\uD83C\uDFE4","\uD83C\uDFE5","\uD83C\uDFE6","\uD83C\uDFE7","\uD83C\uDFE8","\uD83C\uDFE9","\uD83C\uDFEA","\uD83C\uDFEB"
  ];

  function getTileEmoji(type) {
    var idx = type - 1;
    if (idx >= 0 && idx < TILE_EMOJIS.length) return TILE_EMOJIS[idx];
    return "\u2753";
  }

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
          cell.textContent = getTileEmoji(type);
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
