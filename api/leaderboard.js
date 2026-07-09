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
        const users = db.collection('users');

        const topStreaks = await users
            .find({})
            .sort({ streak: -1 })
            .limit(20)
            .project({ deviceId: 1, streak: 1, totalRoundsPlayed: 1, totalRoundsCorrect: 1 })
            .toArray();

        return res.status(200).json({ leaderboard: topStreaks });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to fetch leaderboard', details: err.message });
    }
}