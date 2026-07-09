export async function fetchDailyPuzzle() {
    const res = await fetch('/api/daily-puzzle');
    return res.json();
}

export async function submitGuess(deviceId, roundNumber, selectedIndex) {
    const res = await fetch('/api/submit-guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, roundNumber, selectedIndex }),
    });
    return res.json();
}

export async function fetchLeaderboard() {
    const res = await fetch('/api/leaderboard');
    return res.json();
}