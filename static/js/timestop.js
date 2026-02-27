/**
 * 타임스탑 게임 로직
 * 0.00초 ~ 30.00초, 10.00초 정확 스탑 시 알럿, 그 외 랭킹 기록
 */

const TARGET = 10.0;
const TOLERANCE = 0.01;
const MAX_TIME = 30.0;
const INTERVAL_MS = 10;

let state = {
  time: 0,
  running: false,
  timerId: null,
  startTime: null,
};

const timeDisplay = document.getElementById("timeDisplay");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const rankingBody = document.getElementById("rankingBody");

function formatTime(t) {
  return t.toFixed(2);
}

function updateDisplay() {
  timeDisplay.textContent = formatTime(state.time);
}

function stopTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
  state.running = false;
  startBtn.disabled = false;
  stopBtn.disabled = true;
}

function onStart() {
  if (state.running) return;
  state.time = 0;
  state.running = true;
  state.startTime = performance.now();
  startBtn.disabled = true;
  stopBtn.disabled = false;
  updateDisplay();

  state.timerId = setInterval(function () {
    const elapsed = (performance.now() - state.startTime) / 1000;
    state.time = Math.min(elapsed, MAX_TIME);
    updateDisplay();
    if (state.time >= MAX_TIME) {
      stopTimer();
    }
  }, INTERVAL_MS);
}

function onStop() {
  if (!state.running) return;
  stopTimer();
  const stopTime = state.time;

  const isExact = Math.abs(stopTime - TARGET) <= TOLERANCE;
  if (isExact) {
    alert("대단합니다.");
  } else {
    fetch("/api/timestop/record", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stop_time: stopTime }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          alert(data.error);
        } else {
          loadRanking();
        }
      })
      .catch((err) => alert("기록 저장 실패: " + err.message));
  }
}

function loadRanking() {
  rankingBody.innerHTML = '<tr><td colspan="4" class="text-muted text-center">로딩 중...</td></tr>';
  fetch("/api/timestop/ranking", { credentials: "include" })
    .then((r) => r.json())
    .then((data) => {
      const ranking = data.ranking || [];
      if (ranking.length === 0) {
        rankingBody.innerHTML = '<tr><td colspan="4" class="text-muted text-center">기록이 없습니다.</td></tr>';
      } else {
        rankingBody.innerHTML = ranking
          .map(
            (r) =>
              "<tr><td>" +
              r.rank +
              "</td><td>" +
              escapeHtml(r.username) +
              "</td><td>" +
              r.stop_time +
              "초</td><td>" +
              escapeHtml(r.reg_date) +
              "</td></tr>"
          )
          .join("");
      }
    })
    .catch(() => {
      rankingBody.innerHTML = '<tr><td colspan="4" class="text-danger text-center">랭킹 로드 실패</td></tr>';
    });
}

function escapeHtml(s) {
  if (s == null) return "";
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

startBtn.addEventListener("click", onStart);
stopBtn.addEventListener("click", onStop);

loadRanking();
