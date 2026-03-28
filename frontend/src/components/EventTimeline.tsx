'use client';
import type { Event } from '@/lib/types';

interface EventTimelineProps {
  events: Event[];
  onEventClick: (event: Event) => void;
  selectedEvent: Event | null;
}

const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
};

export default function EventTimeline({ events, onEventClick, selectedEvent }: EventTimelineProps) {
  const sorted = [...events].sort((a, b) => {
    const ta = a.extracted_at || '';
    const tb = b.extracted_at || '';
    return tb.localeCompare(ta);
  });

  if (sorted.length === 0) {
    return (
      <section className="space-y-2 pt-3">
        <span className="text-xs font-light text-slate-300">Event timeline</span>
        <p className="text-[10px] text-slate-600">No events detected yet</p>
      </section>
    );
  }

  return (
    <section className="space-y-2 pt-3">
      <span className="text-xs font-light text-slate-300">Event timeline</span>
      <div className="space-y-0.5 max-h-48 overflow-y-auto">
        {sorted.map((event) => (
          <button
            key={event.id}
            onClick={() => onEventClick(event)}
            className={`w-full text-left px-2 py-1.5 rounded transition-colors ${
              selectedEvent?.id === event.id ? 'bg-primary/10 border border-primary/20' : 'bg-slate-800/20 hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-start gap-2">
              <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${SEVERITY_DOT[event.severity] || 'bg-slate-500'}`} />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-slate-300 truncate">{event.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[8px] font-label text-slate-600 uppercase">{event.source_type}</span>
                  {event.confidence != null && (
                    <span className="data-mono text-[8px] text-slate-600">{event.confidence}%</span>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
