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

    const { deviceId } = req.query;

    try {
        const client = await getClient();
        const db = client.db('twotruthsdb');
        const puzzles = db.collection('puzzles');
        const users = db.collection('users');

        const puzzleDocs = await puzzles
            .find({}, { projection: { date: 1, rounds: 1, _id: 0 } })
            .sort({ date: -1 })
            .toArray();

        let history = {};
        if (deviceId) {
            const user = await users.findOne({ deviceId }, { projection: { history: 1 } });
            history = user?.history || {};
        }

        const dates = puzzleDocs.map((p) => {
            const dayHistory = history[p.date];
            const answeredCount = dayHistory ? Object.keys(dayHistory.answers || {}).length : 0;
            return {
                date: p.date,
                completed: answeredCount >= p.rounds.length,
            };
        });

        return res.status(200).json({ dates });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to fetch puzzle dates', details: err.message });
    }
}