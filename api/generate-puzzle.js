import { MongoClient } from 'mongodb';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Curated pool — skews toward "would actually get sent in a group chat"
// rather than textbook trivia categories.
const TOPICS = [
  'Viral internet memes', 'Celebrity feuds', 'Reality TV shows', 'TikTok trends',
  'Video game speedruns', 'Board games', 'K-pop', 'Anime',
  'Fast food chains', 'Street food', 'Coffee culture', 'Spicy food records',
  'Airline secrets', 'Amusement park rides', 'Casino games', 'Traffic laws around the world',
  'Weird world records', 'Sleep and dreams', 'Money and currency', 'Superstitions',
  'Olympic history', 'Football (soccer) trivia', 'Extreme sports',
  'Space exploration', 'Ancient mysteries', 'Animal intelligence', 'Deep sea creatures',
  'True crime', 'Cults and conspiracy theories', 'Ghost stories and hauntings',
  'Famous heists', 'Lottery winners', 'Cryptids and monsters',
  'Celebrity scandals', 'Movie flops and box office bombs', 'One-hit wonders',
  'Wedding traditions around the world', 'Weird laws that still exist', 'Prison escapes',
  'Cults of personality in history', 'Con artists and scams', 'Wild animal attacks',
  'Extreme diets and fasting trends', 'Haunted objects', 'Unsolved mysteries',
  'Internet urban legends', 'Ancient Rome scandals', 'Royal family drama',
  'Sports superstitions', 'Music industry secrets',
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateContentWithRetry(model, prompt, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await model.generateContent(prompt);
    } catch (err) {
      const isRetryable = err.message.includes('429') || err.message.includes('503');
      if (isRetryable && attempt < retries - 1) {
        const waitTime = 20000;
        console.warn(`Gemini overloaded/rate-limited, waiting ${waitTime / 1000}s before retry (attempt ${attempt + 1})...`);
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

// Zero-cost local sanity checks — replaces the old second-API-call
// verification pass. Catches structural and tone failures without
// spending quota.
function validateRound(round) {
  if (!round.topic || typeof round.topic !== 'string') return false;
  if (!Array.isArray(round.statements) || round.statements.length !== 3) return false;

  for (const s of round.statements) {
    if (typeof s !== 'string') return false;
    const trimmed = s.trim();
    if (trimmed.length < 10) return false;
    if (trimmed.split(/\s+/).length > 25) return false; // too dense/academic
  }

  if (typeof round.fakeIndex !== 'number' || round.fakeIndex < 0 || round.fakeIndex > 2) return false;

  // Reject accidental duplicate statements
  const unique = new Set(round.statements.map((s) => s.trim().toLowerCase()));
  if (unique.size !== 3) return false;

  // Reject overly jargon-y statements as a light heuristic safety net
  const jargonFlags = [
    'correlated', 'quantum', 'infrasound', 'pareidolia', 'longitudinal study',
    'peer-reviewed', 'statistically significant', 'methodology', 'empirical',
  ];
  const hasJargon = round.statements.some((s) =>
    jargonFlags.some((word) => s.toLowerCase().includes(word))
  );
  if (hasJargon) return false;

  return true;
}

async function generateFullPuzzle(genAI, topics) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are writing content for a viral daily phone game called "Two Truths and an AI."
Players read 3 short statements about a topic and have to guess which one is an AI-generated lie.
The game lives or dies on how ENTERTAINING and SHAREABLE the statements are — if they're boring
or read like a textbook, nobody plays again tomorrow. Your only job right now is to make this
fun. Not educational. Not academic. Fun.

Topics for today (use each exactly once, in this exact order):
${topics.map((t, i) => `${i + 1}. ${t}`).join('\n')}

For EACH topic, write exactly 3 statements:
- 2 must be TRUE and genuinely wild, surprising, or juicy facts — the kind of thing that makes
  someone go "wait, WHAT?" and immediately show the person next to them. Prioritize the most
  shocking, funny, gross, dramatic, or unbelievable true facts you know about the topic. Avoid
  "safe" or commonly-known facts — dig for the weird ones.
- Exactly 1 must be FALSE, written to sound just as wild and believable as the true ones.
  Make it convincing using ONE specific concrete detail — a year, a number, a name, a place,
  a brand — NOT a fake scientific mechanism, NOT invented jargon, NOT a fake "study."
  The best fake statements are dramatic and specific, like a juicy rumor, not clinical.

STRICT TONE AND STYLE RULES — follow these exactly:
- Write like you're texting a friend a crazy fact, or like a viral tweet. Casual, punchy, direct.
- Every statement: ONE sentence, maximum 20 words. No semicolons. No stacked clauses. No
  "which resulted in" or "leading to" style academic connectors.
- Use plain, everyday words a 12-year-old would understand. Zero jargon. Banned words/style:
  scientific-sounding terms, invented mechanisms, phrases like "research indicates," "studies show,"
  "correlated with," "linked to," or anything that sounds like a Wikipedia summary.
- Favor concrete drama over abstract explanation: names, numbers, specific years, specific places,
  specific brands/people. "Weird and specific" beats "vague and general" every time.
- Inject personality and a sense of humor where the topic allows it. It's OK to sound a little
  unhinged or gossipy — this is entertainment, not a report.
- Do NOT hedge or use qualifiers like "reportedly," "allegedly," "some believe," "it is said" —
  state everything as a flat, confident fact (yes, even the false one — it should sound just as
  sure of itself as the true ones).

GOOD EXAMPLES (this is the exact tone to match):
- "Octopuses have three hearts, and two of them stop beating the moment they start swimming."
- "In 1518, dozens of people in Strasbourg danced nonstop for days until several dropped dead."
- "McDonald's once tried selling bubblegum-flavored broccoli to get kids to eat vegetables."
- "A man in Florida legally married a video game character in 2009 and it still isn't annulled."
- "Bananas are technically berries, but strawberries are not."

BAD EXAMPLES (never write like this):
- "Infrasound has been scientifically linked to feelings of unease in allegedly haunted locations."
- "A landmark study published in a peer-reviewed journal found a statistically significant correlation..."
- "This phenomenon is often attributed to psychological factors such as pareidolia."

Before finalizing, mentally re-read every statement and ask: "Would a 19-year-old actually send
this to a friend as a funny text?" If any statement sounds like homework, rewrite it simpler and
weirder.

Respond ONLY with valid JSON in this exact format — no markdown, no code fences, no commentary:
{
  "rounds": [
    { "topic": "topic name", "statements": ["s1", "s2", "s3"], "fakeIndex": 0 },
    ... (5 total, in the same order as the topics list above)
  ]
}`;

  const result = await generateContentWithRetry(model, prompt);
  const text = result.response.text().trim().replace(/```json|```/g, '');
  const parsed = JSON.parse(text);

  if (!Array.isArray(parsed.rounds) || parsed.rounds.length !== 5) {
    throw new Error('Gemini did not return exactly 5 rounds');
  }

  const invalidIndex = parsed.rounds.findIndex((r) => !validateRound(r));
  if (invalidIndex !== -1) {
    throw new Error(`Round ${invalidIndex + 1} failed validation (malformed, jargon-y, or duplicate statements)`);
  }

  return parsed.rounds;
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

    const today = new Date().toISOString().split('T')[0];

    const existing = await puzzles.findOne({ date: today });
    if (existing) {
      return res.status(200).json({ message: 'Puzzle already exists for today', date: today });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const topics = pickRandomTopics(5);

    const rounds = await generateFullPuzzle(genAI, topics);

    await puzzles.insertOne({ date: today, rounds, createdAt: new Date() });

    return res.status(200).json({
      message: 'Puzzle generated successfully',
      date: today,
      roundCount: rounds.length,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to generate puzzle', details: err.message });
  } finally {
    await client.close();
  }
}
