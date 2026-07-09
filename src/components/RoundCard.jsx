export default function RoundCard({ round, onSelect, disabled }) {
    return (
        <div className="max-w-xl mx-auto">
            <div className="flex items-baseline justify-between mb-6 font-mono text-muted text-xs tracking-widest uppercase">
                <span>Case File — Round {round.roundNumber} / 5</span>
                <span>One statement is fabricated</span>
            </div>

            <h2 className="font-case text-3xl text-paper mb-8 tracking-wide">
                {round.topic}
            </h2>

            <div className="flex flex-col gap-4">
                {round.statements.map((statement, index) => (
                    <button
                        key={index}
                        disabled={disabled}
                        onClick={() => onSelect(index)}
                        className="text-left bg-paper text-ink font-body text-lg leading-snug
                       rounded-sm p-5 shadow-[0_3px_0_rgba(0,0,0,0.4)]
                       hover:-translate-y-0.5 hover:shadow-[0_5px_0_rgba(0,0,0,0.5)]
                       transition-transform disabled:opacity-40 disabled:pointer-events-none
                       border-l-4 border-transparent hover:border-stamp-red"
                    >
                        {statement}
                    </button>
                ))}
            </div>
        </div>
    );
}