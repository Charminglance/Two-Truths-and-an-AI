export default function ShareCard({ results, streak }) {
    const grid = results.map((correct) => (correct ? '🟩' : '🟥')).join(' ');
    const shareText = `Two Truths and an AI\n${results.filter(Boolean).length}/5\n${grid}\n🔥 ${streak} day streak`;

    function copyToClipboard() {
        navigator.clipboard.writeText(shareText);
        alert('Copied! Paste it anywhere to share.');
    }

    return (
        <div className="bg-card rounded-2xl p-6 max-w-xl mx-auto text-center">
            <h2 className="font-display text-2xl mb-2">
                {results.filter(Boolean).length}/5 correct
            </h2>
            <p className="text-2xl mb-4">{grid}</p>
            <p className="text-neutral-400 mb-6">🔥 {streak} day streak</p>
            <button
                onClick={copyToClipboard}
                className="bg-accent hover:bg-accent/80 rounded-xl px-6 py-3 font-medium w-full"
            >
                Copy results to share
            </button>
        </div>
    );
}