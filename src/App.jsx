import { useEffect, useState } from 'react';
import { getDeviceId } from './lib/device-id';
import { fetchDailyPuzzle, submitGuess } from './lib/api';
import RoundCard from './components/RoundCard';
import ResultReveal from './components/ResultReveal';
import ShareCard from './components/ShareCard';

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

  const deviceId = getDeviceId();

  useEffect(() => {
    fetchDailyPuzzle()
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setPuzzle(data);
        }
      })
      .catch(() => setError('Could not load today\'s puzzle'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSelect(index) {
    setSelectedIndex(index);
    const round = puzzle.rounds[roundIndex];
    const response = await submitGuess(deviceId, round.roundNumber, index);

    if (response.error) {
      setError(response.error);
      return;
    }

    setLastResult({ isCorrect: response.isCorrect, fakeIndex: response.fakeIndex });
    setResults((prev) => [...prev, response.isCorrect]);
    setStreak(response.streak ?? streak);
  }

  function handleNext() {
    const isLast = roundIndex === puzzle.rounds.length - 1;
    if (isLast) {
      setGameOver(true);
    } else {
      setRoundIndex((prev) => prev + 1);
      setSelectedIndex(null);
      setLastResult(null);
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-bg text-white flex items-center justify-center">Loading today's puzzle...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg text-white flex items-center justify-center">
        <p>{error}</p>
      </div>
    );
  }

  const currentRound = puzzle.rounds[roundIndex];

  return (
    <div className="min-h-screen bg-bg text-white py-12 px-4">
      <h1 className="font-case text-2xl text-paper text-center mb-10 tracking-widest uppercase">
        Two Truths and an AI
      </h1>

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
    </div>
  );
}