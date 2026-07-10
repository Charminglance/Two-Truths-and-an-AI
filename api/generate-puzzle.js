import { MongoClient } from 'mongodb';
import { GoogleGenerativeAI } from '@google/generative-ai';

const TOPICS = [
  // Pop culture & internet
  'Viral internet memes', 'Celebrity feuds', 'Reality TV shows', 'TikTok trends',
  'Video game speedruns', 'Board games', 'K-pop', 'Anime',
  // Food & drink
  'Fast food chains', 'Street food', 'Coffee culture', 'Spicy food records',
  // Everyday weird facts
  'Airline secrets', 'Amusement park rides', 'Casino games', 'Traffic laws around the world',
  'Weird world records', 'Sleep and dreams', 'Money and currency', 'Superstitions',
  // Sports
  'Olympic history', 'Football (soccer) trivia', 'Extreme sports',
  // Science/history, but the fun angle
  'Space exploration', 'Ancient mysteries', 'Animal intelligence', 'Deep sea creatures',
  'Serial killers and true crime', 'Cults and conspiracy theories', 'Ghost stories and hauntings',
  'Famous heists', 'Lottery winners', 'Cryptids and monsters',
];

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateContentWithRetry(model, prompt, retries = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            return await model.generateContent(prompt);
        } catch (err) {
            if (err.message.includes('429') && attempt < retries - 1) {
                const waitTime = 20000; // 20 seconds
                console.warn(`Rate limited, waiting ${waitTime / 1000}s before retry...`);
                await sleep(waitTime);
            } else {
                throw err;
            }
        }
    }
}

function pickRandomTopics(count) {
    const shuffled = [...TOPICS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

async function generateRound(genAI, topic, attempt = 0) {
    const MAX_ATTEMPTS = 3;
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const generationPrompt = `Give me 3 statements about "${topic}" for a "spot the fake fact" game.
Exactly 2 must be TRUE and verifiable facts. Exactly 1 must be FALSE but written to sound
completely convincing — include a specific fake date, number, name, or study to make it
believable, the way a confidently wrong AI hallucination would sound.

Respond ONLY in this exact JSON format, no markdown, no extra text:
{
  "statements": ["statement 1", "statement 2", "statement 3"],
  "fakeIndex": 0
}
"fakeIndex" is the 0-based index of the FALSE statement in the array.`;

    const result = await generateContentWithRetry(model, generationPrompt);
    const text = result.response.text().trim().replace(/```json|```/g, '');
    const parsed = JSON.parse(text);

    // Space out calls to stay under the free-tier rate limit (5 req/min)
    await sleep(13000);

    // Verification pass — double-check the 2 "true" statements are actually true
    const trueStatements = parsed.statements.filter((_, i) => i !== parsed.fakeIndex);
    const verifyPrompt = `Fact-check these 2 statements about "${topic}". For each, say TRUE or FALSE
and nothing else, one word per line:
1. ${trueStatements[0]}
2. ${trueStatements[1]}`;

    const verifyResult = await generateContentWithRetry(model, verifyPrompt);
    const verifyText = verifyResult.response.text().toUpperCase();

    // If verification flags either "true" statement as false, retry (capped at MAX_ATTEMPTS)
    if (verifyText.includes('FALSE')) {
        if (attempt >= MAX_ATTEMPTS - 1) {
            console.warn(`Verification kept failing for topic "${topic}" after ${MAX_ATTEMPTS} attempts — using it anyway.`);
            return {
                topic,
                statements: parsed.statements,
                fakeIndex: parsed.fakeIndex,
            };
        }
        console.warn(`Verification failed for topic "${topic}", retrying (attempt ${attempt + 1})...`);
        await sleep(13000);
        return generateRound(genAI, topic, attempt + 1);
    }

    return {
        topic,
        statements: parsed.statements,
        fakeIndex: parsed.fakeIndex,
    };
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const cronSecret = req.headers['x-cron-secret'];
    if (cronSecret !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const client = new MongoClient(process.env.MONGODB_URI);

    try {
        await client.connect();
        const db = client.db('twotruthsdb');
        const puzzles = db.collection('puzzles');

        const today = new Date().toISOString().split('T')[0]; // "2026-07-09"

        const existing = await puzzles.findOne({ date: today });
        if (existing) {
            return res.status(200).json({ message: 'Puzzle already exists for today', date: today });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const topics = pickRandomTopics(5);

        const rounds = [];
        for (const topic of topics) {
            const round = await generateRound(genAI, topic);
            rounds.push(round);
            await sleep(13000); // spacing between topics too
        }

        await puzzles.insertOne({ date: today, rounds, createdAt: new Date() });

        return res.status(200).json({ message: 'Puzzle generated successfully', date: today, roundCount: rounds.length });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to generate puzzle', details: err.message });
    } finally {
        await client.close();
    }
}
