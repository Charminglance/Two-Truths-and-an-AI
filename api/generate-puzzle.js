import { MongoClient } from 'mongodb';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Curated pool — skews toward things an Indian audience already has context
// on (Bollywood, cricket, Indian food, Indian apps, everyday India-specific
// rules) so the "wait, WHAT?" reaction actually lands, with a smaller slice
// of globally-relatable modern topics mixed in for variety.
const TOPICS = [
  // Indian pop culture & entertainment
  'Bollywood behind-the-scenes secrets', 'Bollywood box office flops', 'South Indian cinema (Kollywood/Tollywood)',
  'Indian reality TV shows', 'Indian YouTubers and influencers', 'Indian web series drama',
  'Cricket and IPL trivia', 'Indian cricketers off the field',
  // Indian food & everyday life
  'Street food across Indian cities', 'Regional Indian food rivalries', 'Indian fast food chain secrets',
  'Chai and filter coffee culture', 'Indian wedding traditions and expenses', 'Indian railway facts and rules',
  'Auto-rickshaw and traffic rules in India', 'Indian festival traditions', 'Bizarre Indian government rules',
  'Indian school and exam rules', 'Indian startup and unicorn drama', 'UPI and Indian fintech trivia',
  // Indian internet & viral culture
  'Indian memes and viral trends', 'Indian Instagram and TikTok-era trends', 'Indian gaming and esports',
  'Indian celebrity social media drama', 'Indian brand ad controversies',
  // Broader relatable modern topics (kept for variety)
  'Weird laws that still exist around the world', 'Weird world records', 'Airline and airport rules',
  'Fast food menu items around the world', 'Social media platform rules and bans',
  'Streaming service secrets', 'Weird product recalls', 'Theme park and ride safety rules',
  'Weird sports rules', 'Bizarre real product warning labels', 'Strange things that are technically legal',
  'True crime', 'Ghost stories and hauntings', 'Cryptids and monsters', 'Unsolved mysteries',
  'Con artists and scams', 'Lottery winners', 'Famous heists',
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

// Gemini reliably drafts the 2 truths first and appends the fabricated
// statement last, so fakeIndex comes back as 2 almost every time regardless
// of prompting. Shuffle each round's statements ourselves and remap
// fakeIndex so the lie's position is actually uniform across 0/1/2.
function shuffleRound(round) {
  const order = [0, 1, 2];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  const statements = order.map((originalIndex) => round.statements[originalIndex]);
  const fakeIndex = order.indexOf(round.fakeIndex);

  return { ...round, statements, fakeIndex };
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

  // Reject overly jargon-y or overly obscure-history statements as a light heuristic safety net
  const jargonFlags = [
    'correlated', 'quantum', 'infrasound', 'pareidolia', 'longitudinal study',
    'peer-reviewed', 'statistically significant', 'methodology', 'empirical',
    'dynasty', 'ancient', 'medieval', 'century', 'civilization',
  ];
  const hasJargon = round.statements.some((s) =>
    jargonFlags.some((word) => s.toLowerCase().includes(word))
  );
  if (hasJargon) return false;

  return true;
}

async function generateFullPuzzle(genAI, topics) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are writing content for a viral daily phone game called "Two Truths and an AI,"
aimed primarily at a young Indian audience (college students, young professionals across India).
Players read 3 short statements about a topic and have to guess which one is an AI-generated lie.
The game lives or dies on how ENTERTAINING and RELATABLE the statements are — if a statement
needs background an Indian reader wouldn't have, it fails, no matter how "true" it is.

Topics for today (use each exactly once, in this exact order):
${topics.map((t, i) => `${i + 1}. ${t}`).join('\n')}

For EACH topic, write exactly 3 statements:
- 2 must be TRUE and genuinely surprising facts. WHEN THE TOPIC IS INDIA-SPECIFIC (Bollywood,
  cricket/IPL, Indian food, Indian apps/UPI, Indian railways, Indian festivals, Indian startups,
  Indian traffic/government rules, Indian internet culture), lean fully into real Indian names,
  brands, cities, and numbers — Mumbai, Bengaluru, Delhi, Chennai, Swiggy, Zomato, Paytm, IRCTC,
  BCCI, specific actors/cricketers, specific Indian laws — not vague or Western substitutes.
  WHEN THE TOPIC IS GLOBAL/general, keep it modern and relatable but still pick facts an Indian
  reader would find wild and easy to picture. Prioritize facts that make someone go "wait, WHAT?
  no way" — a weird rule, a wild real number, a policy that sounds made up but isn't.
- Exactly 1 must be FALSE, written to sound just as wild and believable as the true ones.
  Make it convincing using ONE specific concrete detail — a year, a number, a name, a brand,
  a city — NOT a fake scientific mechanism, NOT invented jargon, NOT a fake "study."
  The best fake statements sound like a real rule, policy, or celebrity story that got
  exaggerated, not a history lesson.

HARD BAN — do not use any of these, they kill engagement:
- Ancient/medieval history, old dynasties, or anything more than ~30 years old unless it's
  directly about a still-famous modern event/person/brand
- Academic/scientific-sounding facts (biology mechanisms, physics, psychology terms)
- Generic Western-only references when an Indian equivalent exists and fits better
- Anything requiring the reader to already know an obscure fact just to parse the sentence

STRICT TONE AND STYLE RULES:
- Write like you're texting a friend a crazy fact, or like a viral Indian Twitter/Instagram post.
  Casual, punchy, direct.
- Every statement: ONE sentence, maximum 20 words. No semicolons. No stacked clauses.
- Use plain, everyday words — the kind of English used in Indian meme captions, not textbook English.
- Favor concrete drama over abstract explanation: real names, numbers, specific brands/cities.
- Inject personality and humor. It's fine to sound gossipy — this is entertainment, not a report.
- Do NOT hedge with "reportedly," "allegedly," "some believe" — state everything as a flat,
  confident fact, even the false one.

GOOD EXAMPLES (this is the exact tone, recency, and Indian-relevance to match):
- "Swiggy once delivered a single ice cube to a customer in Bengaluru who requested it as a joke."
- "MS Dhoni owns a private zoo at his Ranchi farmhouse with over 200 dog breeds."
- "Mumbai locals carry over 7.5 million passengers a day, more than the population of Switzerland."
- "IRCTC's website used to crash so often during Tatkal booking that college kids built browser extensions just to beat it."
- "Some Bengaluru traffic signals have a countdown timer so precise that auto drivers switch off engines to save fuel."
- "A man in Kerala legally renamed himself after Google Pay to get free publicity in 2019."

BAD EXAMPLES (never write like this — too historical, too academic, or unrelatable):
- "In 1518, dozens of people in Strasbourg danced nonstop for days until several dropped dead."
- "Infrasound has been scientifically linked to feelings of unease in allegedly haunted locations."
- "A landmark study published in a peer-reviewed journal found a statistically significant correlation..."
- "In ancient Rome, senators would often..."

Before finalizing, mentally re-read every statement and ask: "Would a young Indian reader
immediately get why this is surprising, without needing extra context?" If a statement needs
background they probably don't have, replace it with something about an Indian brand, celebrity,
city, or everyday rule instead.

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
    throw new Error(`Round ${invalidIndex + 1} failed validation (malformed, jargon-y/historical, or duplicate statements)`);
  }

  return parsed.rounds.map(shuffleRound);
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