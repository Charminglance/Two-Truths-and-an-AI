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
    if (!deviceId) {
        return res.status(400).json({ error: 'Missing deviceId' });
    }

    try {
        const client = await getClient();
        const db = client.db('twotruthsdb');
        const users = db.collection('users');

        const user = await users.findOne(
            { deviceId },
            { projection: { streak: 1, lastPlayedDate: 1, totalRoundsPlayed: 1, totalRoundsCorrect: 1 } }
        );

        return res.status(200).json({ streak: user?.streak ?? 0 });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to fetch user stats', details: err.message });
    }
}