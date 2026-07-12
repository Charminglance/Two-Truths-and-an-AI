export default function ShareCard({ results, streak }) {
    const grid = results.map((correct) => (correct ? '🟩' : '🟥')).join(' ');
    const correctCount = results.filter(Boolean).length;
    const shareText = `Two Truths and an AI\n${correctCount}/5\n${grid}\n🔥 ${streak} day streak`;

    function copyToClipboard() {
        navigator.clipboard.writeText(shareText);
        alert('Copied! Paste it anywhere to share.');
    }

    return (
        <div className="max-w-xl mx-auto text-center">
            <p className="font-mono text-muted text-xs tracking-widest uppercase mb-4">
                Case Closed
            </p>
            <h2 className="font-case text-3xl text-paper mb-2 tracking-wide">
                {correctCount}/5 correct
            </h2>
            <p className="text-3xl mb-4">{grid}</p>
            <p className="font-mono text-muted text-sm mb-8 tracking-widest uppercase">
                🔥 {streak} day streak
            </p>
            <button
                onClick={copyToClipboard}
                className="font-case tracking-widest uppercase text-sm bg-paper text-ink
                   rounded-sm px-6 py-3 w-full hover:bg-white transition-colors"
            >
                Copy results to share
            </button>
        </div>
    );
}