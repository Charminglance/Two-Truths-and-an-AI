export async function fetchDailyPuzzle() {
    const res = await fetch('/api/daily-puzzle');
    return res.json();
}

export async function fetchPuzzleByDate(date) {
    const res = await fetch(`/api/daily-puzzle?date=${date}`);
    return res.json();
}

export async function submitGuess(deviceId, roundNumber, selectedIndex, date) {
    const res = await fetch('/api/submit-guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, roundNumber, selectedIndex, date }),
    });
    return res.json();
}

export async function fetchLeaderboard() {
    const res = await fetch('/api/leaderboard');
    return res.json();
}

export async function fetchPuzzleDates(deviceId) {
    const url = deviceId ? `/api/puzzle-dates?deviceId=${deviceId}` : '/api/puzzle-dates';
    const res = await fetch(url);
    return res.json();
}

export async function fetchUserStats(deviceId) {
    const res = await fetch(`/api/user-stats?deviceId=${deviceId}`);
    return res.json();
}