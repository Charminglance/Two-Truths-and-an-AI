import { useEffect, useState } from 'react';
import { fetchPuzzleDates } from '../lib/api';

function formatDateLabel(dateStr) {
    const date = new Date(dateStr + 'T00:00:00Z');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function ArchiveCalendar({ isOpen, onClose, onSelectDate, currentDate }) {
    const [dates, setDates] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchPuzzleDates()
                .then((data) => setDates(data.dates || []))
                .finally(() => setLoading(false));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            <div className="relative w-full max-w-sm bg-ink border-l border-muted/30 h-full overflow-y-auto p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-case text-lg text-paper tracking-widest uppercase">Case Archive</h3>
                    <button onClick={onClose} className="text-muted hover:text-paper font-mono text-sm">✕ Close</button>
                </div>

                {loading ? (
                    <p className="text-muted font-mono text-sm">Loading archive...</p>
                ) : dates.length === 0 ? (
                    <p className="text-muted font-mono text-sm">No past cases yet — check back tomorrow.</p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {dates.map((date) => (
                            <button
                                key={date}
                                onClick={() => {
                                    onSelectDate(date);
                                    onClose();
                                }}
                                className={`text-left font-mono text-sm px-4 py-3 rounded-sm border transition-colors
                  ${date === currentDate
                                        ? 'bg-paper text-ink border-paper'
                                        : 'bg-transparent text-paper border-muted/30 hover:border-paper'}`}
                            >
                                {formatDateLabel(date)}
                                {date === currentDate && <span className="ml-2 text-xs">(viewing)</span>}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}