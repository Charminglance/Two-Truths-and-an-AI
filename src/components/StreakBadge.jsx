export default function StreakBadge({ streak, onOpenArchive }) {
    return (
        <div className="fixed top-4 right-4 flex items-center gap-3 font-mono text-xs">
            <button
                onClick={onOpenArchive}
                className="bg-transparent border border-muted/40 text-paper px-3 py-2 rounded-sm
                   hover:border-paper transition-colors tracking-widest uppercase"
            >
                📂 Archive
            </button>
            {streak > 0 && (
                <div className="bg-paper text-ink px-3 py-2 rounded-sm tracking-widest uppercase font-semibold">
                    Streak: {streak}
                </div>
            )}
        </div>
    );
}