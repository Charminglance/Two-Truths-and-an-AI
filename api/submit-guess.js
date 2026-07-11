import { MongoClient } from 'mongodb';

let cachedClient = null;
async function getClient() {
    if (cachedClient) return cachedClient;
    cachedClient = new MongoClient(process.env.MONGODB_URI);
    await cachedClient.connect();
    return cachedClient;
}

function getTodayString() {
    return new Date().toISOString().split('T')[0];
}

function getYesterdayString() {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().split('T')[0];
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { deviceId, roundNumber, selectedIndex, date } = req.body;

    if (!deviceId || roundNumber === undefined || selectedIndex === undefined) {
        return res.status(400).json({ error: 'Missing deviceId, roundNumber, or selectedIndex' });
    }

    const today = getTodayString();
    const targetDate = date || today;
    const isReplayingPast = targetDate !== today;

    try {
        const client = await getClient();
        const db = client.db('twotruthsdb');
        const puzzles = db.collection('puzzles');
        const users = db.collection('users');

        const puzzle = await puzzles.findOne({ date: targetDate });

        if (!puzzle) {
            return res.status(404).json({ error: `No puzzle available for ${targetDate}` });
        }

        const round = puzzle.rounds[roundNumber - 1];
        if (!round) {
            return res.status(400).json({ error: 'Invalid round number' });
        }

        const isCorrect = selectedIndex === round.fakeIndex;

        // Practice mode: score the guess but never touch streak/history/stats
        if (isReplayingPast) {
            return res.status(200).json({
                isCorrect,
                fakeIndex: round.fakeIndex,
                practiceMode: true,
            });
        }

        // Track per-user daily progress so refresh doesn't let them replay a round
        let user = await users.findOne({ deviceId });
        if (!user) {
            user = {
                deviceId,
                streak: 0,
                lastPlayedDate: null,
                totalRoundsPlayed: 0,
                totalRoundsCorrect: 0,
                history: {}, // { "2026-07-09": { answers: {...}, correctCount: 0 } }
            };
            await users.insertOne(user);
        }

        const todayHistory = user.history[today] || { answers: {}, correctCount: 0 };

        // Prevent re-answering the same round twice
        if (todayHistory.answers[roundNumber] !== undefined) {
            return res.status(200).json({
                alreadyAnswered: true,
                wasCorrect: todayHistory.answers[roundNumber] === round.fakeIndex,
                fakeIndex: round.fakeIndex,
            });
        }

        todayHistory.answers[roundNumber] = selectedIndex;
        if (isCorrect) todayHistory.correctCount += 1;

        const isLastRound = roundNumber === puzzle.rounds.length;
        let newStreak = user.streak;

        // Only update streak logic once the full day's 5 rounds are done
        if (isLastRound) {
            const yesterday = getYesterdayString();
            if (user.lastPlayedDate === yesterday || user.lastPlayedDate === today) {
                newStreak = user.streak + (user.lastPlayedDate === today ? 0 : 1);
            } else {
                newStreak = 1; // streak broken, restart
            }
        }

        await users.updateOne(
            { deviceId },
            {
                $set: {
                    [`history.${today}`]: todayHistory,
                    lastPlayedDate: isLastRound ? today : user.lastPlayedDate,
                    streak: newStreak,
                },
                $inc: {
                    totalRoundsPlayed: 1,
                    totalRoundsCorrect: isCorrect ? 1 : 0,
                },
            }
        );

        return res.status(200).json({
            isCorrect,
            fakeIndex: round.fakeIndex,
            streak: newStreak,
            roundsCompletedToday: Object.keys(todayHistory.answers).length,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to submit guess', details: err.message });
    }
}