# Two Truths and an AI

A daily browser game where you're shown 3 statements about a topic — two true, one fabricated by AI — and have to spot the lie. Five rounds a day, streak-tracked, no login required.

🔗 **Play it:** [twotruth.safeel.in](https://twotruth.safeel.in)

## How it works

Every statement set is generated once a day by Gemini and stored in MongoDB. Players get 5 rounds per day, each with 3 statements on a topic (pop culture, weird history, internet trivia, true crime, etc.) — two real, one AI-fabricated but written to sound just as convincing. Guess wrong enough times and you'll start doubting facts you actually knew.

- **Daily ritual, Wordle-style**: one puzzle a day, streak breaks if you miss a day
- **No accounts**: an anonymous device ID (stored in `localStorage`) tracks your streak — zero signup friction, but streaks persist across visits on the same browser
- **Archive**: browse and replay any past day's puzzle in practice mode (doesn't affect your streak)
- **Share card**: Wordle-style emoji grid + streak, copyable to share results

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite + Tailwind v4 |
| Backend | Vercel Serverless Functions (`/api`) |
| Database | MongoDB Atlas (free M0 tier) |
| AI | Gemini 2.5 Flash (`@google/generative-ai`) |
| Scheduling | GitHub Actions (daily cron) |
| Hosting | Vercel, subdomain of [safeel.in](https://safeel.in) |

Fully free-tier: no paid infra anywhere in the stack.

## Architecture

```
├── api/
│   ├── generate-puzzle.js   # Cron-triggered: generates a full day's puzzle in one Gemini call
│   ├── daily-puzzle.js      # GET: returns today's (or a past date's) puzzle, no answers included
│   ├── submit-guess.js      # POST: scores a guess, updates streak (skipped in practice mode)
│   ├── puzzle-dates.js      # GET: list of dates with puzzles, powers the archive
│   └── leaderboard.js       # GET: top streaks
├── src/
│   ├── components/
│   │   ├── RoundCard.jsx        # The 3-statement guessing screen
│   │   ├── ResultReveal.jsx     # Stamped verdict after guessing
│   │   ├── ShareCard.jsx        # End-of-game share grid
│   │   ├── StreakBadge.jsx      # Streak counter + archive trigger
│   │   ├── ArchiveCalendar.jsx  # Slide-out list of past puzzles
│   │   └── ProgressDots.jsx     # Round 1–5 progress indicator
│   ├── lib/
│   │   ├── device-id.js     # Anonymous localStorage device ID
│   │   └── api.js           # Fetch wrappers for /api routes
│   └── App.jsx
└── .github/workflows/
    └── daily-puzzle.yml     # Daily cron → calls /api/generate-puzzle
```

## Puzzle generation

Each day, a GitHub Actions workflow fires a single authenticated request to `/api/generate-puzzle`, which:

1. Checks if today's puzzle already exists (idempotent — safe to re-trigger)
2. Picks 5 random topics from a curated pool (~50 topics, skewed toward pop culture, internet trivia, and "wait, really?" facts rather than textbook trivia)
3. Sends **one** Gemini call asking for all 5 rounds at once, with a tone-locked prompt (casual, punchy, zero jargon, concrete fake details instead of fabricated "studies")
4. Validates the response locally (structure, word count, no duplicate statements, no jargon leakage) — no second API call needed
5. Retries on `429`/`503` with backoff, and stores the result in MongoDB

## Local development

```bash
npm install
vercel env pull .env.local   # pulls MONGODB_URI, GEMINI_API_KEY, CRON_SECRET
vercel dev
```

Manually trigger puzzle generation locally:
```bash
curl -X POST http://localhost:3000/api/generate-puzzle -H "x-cron-secret: YOUR_CRON_SECRET"
```

### Environment variables

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `GEMINI_API_KEY` | Gemini API key from Google AI Studio |
| `CRON_SECRET` | Shared secret so only the GitHub Action can trigger generation |

## Design

Case-file / interrogation aesthetic — statements read like evidence cards, and the reveal is a literal rubber-stamp verdict ("VERIFIED" / "FABRICATED"). Typewriter display face, serif body text, ink-navy background, aged-paper cards.

## Status

Actively being built — see commit history for progress. Known focus areas: tuning puzzle tone/quality over time, expanding the topic pool, leaderboard UI.

---

Built by [Safeel A](https://safeel.in) · [GitHub](https://github.com/Charminglance)
