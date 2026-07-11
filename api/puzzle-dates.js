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

        const dates = await puzzles
            .find({}, { projection: { date: 1, _id: 0 } })
            .sort({ date: -1 })
            .toArray();

        return res.status(200).json({ dates: dates.map((d) => d.date) });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to fetch puzzle dates', details: err.message });
    }
}