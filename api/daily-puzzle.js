import { MongoClient } from 'mongodb';

let cachedClient = null;
async function getClient() {
    if (cachedClient) return cachedClient;
    cachedClient = new MongoClient(process.env.MONGODB_URI);
    await cachedClient.connect();
    return cachedClient;
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const client = await getClient();
        const db = client.db('twotruthsdb');
        const puzzles = db.collection('puzzles');

        const today = new Date().toISOString().split('T')[0];
        const puzzle = await puzzles.findOne({ date: today });

        if (!puzzle) {
            return res.status(404).json({ error: 'No puzzle available for today yet' });
        }

        // Strip fakeIndex before sending to client — don't leak the answer
        const safeRounds = puzzle.rounds.map((round, index) => ({
            roundNumber: index + 1,
            topic: round.topic,
            statements: round.statements,
        }));

        return res.status(200).json({ date: puzzle.date, rounds: safeRounds });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to fetch puzzle', details: err.message });
    }
}