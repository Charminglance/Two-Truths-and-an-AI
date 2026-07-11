export default function ProgressDots({ total, current, results }) {
    return (
        <div className="flex justify-center gap-2 mb-8">
            {Array.from({ length: total }).map((_, i) => {
                const isAnswered = i < results.length;
                const wasCorrect = results[i];
                return (
                    <div
                        key={i}
                        className={`w-2.5 h-2.5 rounded-full border ${isAnswered
                                ? wasCorrect
                                    ? 'bg-stamp-green border-stamp-green'
                                    : 'bg-stamp-red border-stamp-red'
                                : i === current
                                    ? 'border-paper bg-transparent'
                                    : 'border-muted/40 bg-transparent'
                            }`}
                    />
                );
            })}
        </div>
    );
}