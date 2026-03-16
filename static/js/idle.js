document.addEventListener("DOMContentLoaded", () => {
    const stageEl = document.getElementById("current-stage");
    const pendingExpEl = document.getElementById("pending-exp");
    const userHpEl = document.getElementById("user-hp");
    const userStrEl = document.getElementById("user-str");
    const userDexEl = document.getElementById("user-dex");
    const bossHpEl = document.getElementById("boss-hp");
    const bossStrEl = document.getElementById("boss-str");
    const winChanceEl = document.getElementById("win-chance");
    
    const btnClaim = document.getElementById("btn-claim");
    const btnBattle = document.getElementById("btn-battle");

    let statusData = null;
    let updateInterval = null;

    async function fetchStatus() {
        try {
            const res = await fetch("/api/idle");
            const data = await res.json();
            if (data.error) {
                if (data.redirect) window.location.href = data.redirect;
                return;
            }
            statusData = data;
            renderStatus();
        } catch (err) {
            console.error("Failed to fetch idle status", err);
        }
    }

    function renderStatus() {
        if (!statusData) return;

        stageEl.textContent = statusData.stage;
        userHpEl.textContent = statusData.user_stats.hp;
        userStrEl.textContent = statusData.user_stats.str;
        userDexEl.textContent = statusData.user_stats.dex;
        
        bossHpEl.textContent = statusData.boss.hp;
        bossStrEl.textContent = statusData.boss.str;
        winChanceEl.textContent = statusData.win_chance + "%";

        updatePendingExp();
    }

    function updatePendingExp() {
        if (!statusData) return;
        
        const now = new Date();
        const lastClaimed = new Date(statusData.last_claimed_at);
        const hours = (now - lastClaimed) / (1000 * 60 * 60);
        const pending = Math.floor(hours * statusData.stage * 50);
        
        pendingExpEl.textContent = pending.toLocaleString();
    }

    btnClaim.addEventListener("click", async () => {
        btnClaim.disabled = true;
        try {
            const res = await fetch("/api/idle/claim", { method: "POST" });
            const data = await res.json();
            if (data.ok) {
                if (data.claimed_exp > 0) {
                    alert(`${data.claimed_exp} 경험치를 수령했습니다!`);
                    if (data.leveled_up) {
                        alert(`축하합니다! 레벨 ${data.level}로 올랐습니다!`);
                        location.reload();
                    }
                } else {
                    alert("수령할 경험치가 없습니다.");
                }
                fetchStatus();
            } else {
                alert(data.error || "수령 실패");
            }
        } catch (err) {
            alert("통신 오류가 발생했습니다.");
        } finally {
            btnClaim.disabled = false;
        }
    });

    btnBattle.addEventListener("click", async () => {
        if (!confirm("다음 스테이지 보스에게 도전하시겠습니까?")) return;
        
        btnBattle.disabled = true;
        try {
            const res = await fetch("/api/idle/battle", { method: "POST" });
            const data = await res.json();
            if (data.ok) {
                if (data.success) {
                    alert(`승리! Stage ${data.new_stage}에 진입했습니다!`);
                } else {
                    alert(data.message || "패배했습니다. 능력치를 더 올려서 도전하세요!");
                }
                fetchStatus();
            } else {
                alert(data.error || "도전 실패");
            }
        } catch (err) {
            alert("통신 오류가 발생했습니다.");
        } finally {
            btnBattle.disabled = false;
        }
    });

    // 초기화
    fetchStatus();
    // 5초마다 누적 경험치 UI 갱신 (서버 통신 없이 로컬 계산)
    setInterval(updatePendingExp, 5000);
});
