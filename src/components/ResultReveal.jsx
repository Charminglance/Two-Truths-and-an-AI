export default function ResultReveal({ round, selectedIndex, isCorrect, onNext, isLastRound }) {
    return (
        <div className="max-w-xl mx-auto">
            <p className={`font-case text-2xl mb-6 tracking-wide ${isCorrect ? 'text-stamp-green' : 'text-stamp-red'}`}>
                {isCorrect ? '// CORRECT CALL' : '// YOU WERE FOOLED'}
            </p>

            <div className="flex flex-col gap-4 mb-8">
                {round.statements.map((statement, index) => {
                    const isFake = index === round.fakeIndex;
                    const wasSelected = index === selectedIndex;
                    return (
                        <div key={index} className="relative bg-paper text-ink font-body text-lg leading-snug rounded-sm p-5 overflow-hidden">
                            <p className={wasSelected ? 'ring-2 ring-ink rounded-sm -m-1 p-1' : ''}>{statement}</p>
                            <span
                                className={`absolute -right-2 -top-2 font-case text-xs px-3 py-1 rotate-[-8deg] border-2 rounded-sm
                  ${isFake
                                        ? 'text-stamp-red border-stamp-red bg-paper/90'
                                        : 'text-stamp-green border-stamp-green bg-paper/90'}`}
                            >
                                {isFake ? 'FABRICATED' : 'VERIFIED'}
                            </span>
                        </div>
                    );
                })}
            </div>

            <button
                onClick={onNext}
                className="font-case tracking-widest uppercase text-sm bg-paper text-ink
                   rounded-sm px-6 py-3 w-full hover:bg-white transition-colors"
            >
                {isLastRound ? 'Close case file' : 'Next round →'}
            </button>
        </div>
    );
}