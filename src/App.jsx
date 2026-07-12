import { useEffect, useState } from 'react';
import { getDeviceId } from './lib/device-id';
import { fetchDailyPuzzle, submitGuess, fetchPuzzleByDate } from './lib/api';
import RoundCard from './components/RoundCard';
import ResultReveal from './components/ResultReveal';
import ShareCard from './components/ShareCard';
import StreakBadge from './components/StreakBadge';
import ArchiveCalendar from './components/ArchiveCalendar';
import ProgressDots from './components/ProgressDots';

function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

function getProgressKey(date) {
  return `ttai_progress_${date}`;
}

function saveProgress(date, data) {
  localStorage.setItem(getProgressKey(date), JSON.stringify(data));
}

function loadProgress(date) {
  const raw = localStorage.getItem(getProgressKey(date));
  return raw ? JSON.parse(raw) : null;
}

export default function App() {
  const [puzzle, setPuzzle] = useState(null);
  const [roundIndex, setRoundIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [lastResult, setLastResult] = useState(null); // { isCorrect, fakeIndex }
  const [results, setResults] = useState([]); // per-round correctness for share card
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [viewedDate, setViewedDate] = useState(null); // null = today

  const deviceId = getDeviceId();

  useEffect(() => {
    loadPuzzle(fetchDailyPuzzle());
  }, []);

  function loadPuzzle(promise) {
    setLoading(true);
    setError(null);
    promise
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setPuzzle(data);
          const saved = loadProgress(data.date);
          if (saved) {
            setRoundIndex(saved.roundIndex);
            setResults(saved.results);
            setGameOver(saved.gameOver);
          } else {
            setRoundIndex(0);
            setResults([]);
            setGameOver(false);
          }
          setSelectedIndex(null);
          setLastResult(null);
        }
      })
      .catch(() => setError('Could not load this puzzle'))
      .finally(() => setLoading(false));
  }

  function resetRoundState() {
    setRoundIndex(0);
    setSelectedIndex(null);
    setLastResult(null);
    setResults([]);
    setGameOver(false);
  }

  function handleSelectDate(date) {
    resetRoundState();
    const today = getTodayString();
    setViewedDate(date === today ? null : date); // treat today-in-archive as live, not practice
    loadPuzzle(fetchPuzzleByDate(date));
  }

  async function handleSelect(index) {
    setSelectedIndex(index);
    const round = puzzle.rounds[roundIndex];
    const dateForRequest = viewedDate || puzzle.date;
    const response = await submitGuess(deviceId, round.roundNumber, index, dateForRequest);

    if (response.error) {
      setError(response.error);
      return;
    }

    // If we already answered this round (e.g. resubmitted after a stale refresh),
    // trust the backend's recorded answer instead of assuming failure.
    const isCorrect = response.alreadyAnswered ? response.wasCorrect : response.isCorrect;

    setLastResult({ isCorrect, fakeIndex: response.fakeIndex });
    const newResults = [...results, isCorrect];
    setResults(newResults);
    if (!response.practiceMode) {
      setStreak(response.streak ?? streak);
    }
    saveProgress(dateForRequest, { roundIndex, results: newResults, gameOver: false });
  }

  function handleNext() {
    const isLast = roundIndex === puzzle.rounds.length - 1;
    const dateForRequest = viewedDate || puzzle.date;
    if (isLast) {
      setGameOver(true);
      saveProgress(dateForRequest, { roundIndex, results, gameOver: true });
    } else {
      const nextIndex = roundIndex + 1;
      setRoundIndex(nextIndex);
      setSelectedIndex(null);
      setLastResult(null);
      saveProgress(dateForRequest, { roundIndex: nextIndex, results, gameOver: false });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <p className="font-mono text-muted text-sm tracking-widest uppercase animate-pulse">
          Opening case file...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="font-case text-xl text-stamp-red mb-3 tracking-wide">Case Not Found</p>
          <p className="font-mono text-sm text-muted mb-6">{error}</p>
          <button
            onClick={() => {
              setViewedDate(null);
              resetRoundState();
              loadPuzzle(fetchDailyPuzzle());
            }}
            className="font-case tracking-widest uppercase text-xs bg-paper text-ink rounded-sm px-5 py-3"
          >
            Back to today
          </button>
        </div>
      </div>
    );
  }

  const currentRound = puzzle.rounds[roundIndex];

  return (
    <div className="min-h-screen bg-ink text-white py-12 px-4">
      <StreakBadge streak={streak} onOpenArchive={() => setArchiveOpen(true)} />

      <h1 className="font-case text-2xl text-paper text-center mb-2 tracking-widest uppercase">
        Two Truths and an AI
      </h1>

      {viewedDate && (
        <p className="text-center font-mono text-xs text-muted mb-6 tracking-widest uppercase">
          Practice Mode — {viewedDate} (streak not affected)
        </p>
      )}

      {!gameOver && (
        <ProgressDots total={puzzle.rounds.length} current={roundIndex} results={results} />
      )}

      {gameOver ? (
        <ShareCard results={results} streak={streak} />
      ) : lastResult ? (
        <ResultReveal
          round={{ ...currentRound, fakeIndex: lastResult.fakeIndex }}
          selectedIndex={selectedIndex}
          isCorrect={lastResult.isCorrect}
          onNext={handleNext}
          isLastRound={roundIndex === puzzle.rounds.length - 1}
        />
      ) : (
        <RoundCard round={currentRound} onSelect={handleSelect} disabled={selectedIndex !== null} />
      )}

      <ArchiveCalendar
        isOpen={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onSelectDate={handleSelectDate}
        currentDate={viewedDate || puzzle.date}
      />
    </div>
  );
}