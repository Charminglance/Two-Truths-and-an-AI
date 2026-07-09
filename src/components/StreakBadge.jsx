export default function StreakBadge({ streak }) {
    if (!streak) return null;
    return (
        <div className="fixed top-4 right-4 bg-card rounded-full px-4 py-2 text-sm">
            🔥 {streak}
        </div>
    );
}