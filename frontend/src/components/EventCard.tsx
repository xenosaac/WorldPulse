'use client';
import type { Event } from '@/lib/types';

interface EventCardProps {
  event: Event;
  onClose: () => void;
}

const SEVERITY_BG: Record<string, string> = {
  critical: 'bg-red-900/60 text-red-200',
  high: 'bg-orange-900/60 text-orange-200',
  medium: 'bg-yellow-900/60 text-yellow-200',
  low: 'bg-green-900/60 text-green-200',
};

export default function EventCard({ event, onClose }: EventCardProps) {
  return (
    <div className="glass-panel border border-white/5 p-5 shadow-2xl rounded-xl">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-[10px] font-label font-medium tracking-widest text-primary uppercase mb-1">
            Active Incident
          </p>
          <h2 className="text-lg font-light leading-tight text-white">{event.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-[9px] font-label font-bold rounded uppercase ${SEVERITY_BG[event.severity] || 'bg-slate-700 text-slate-300'}`}>
            {event.severity}
          </span>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-lg leading-none">&times;</button>
        </div>
      </div>

      {event.description && (
        <p className="text-[11px] text-slate-400 leading-relaxed mb-4">{event.description}</p>
      )}

      {event.confidence != null && (
        <div className="mb-5">
          <div className="flex justify-between items-end mb-1">
            <p className="text-[10px] font-label text-slate-500 uppercase tracking-wider">Confidence</p>
            <p className="data-mono text-xs text-primary">{event.confidence.toFixed(2)}%</p>
          </div>
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${event.confidence}%` }} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-[10px] font-label text-slate-500 uppercase tracking-wider">Source</p>
          <p className="data-mono text-sm text-slate-200 capitalize">{event.source_type}</p>
        </div>
        {event.video_timestamp != null && (
          <div>
            <p className="text-[10px] font-label text-slate-500 uppercase tracking-wider">Video time</p>
            <p className="data-mono text-sm text-slate-200">{event.video_timestamp.toFixed(1)}s</p>
          </div>
        )}
      </div>

      {event.evidence && (
        <p className="text-[10px] text-slate-500 italic mb-4">{event.evidence}</p>
      )}

      {event.affected_sectors && event.affected_sectors.length > 0 && (
        <div>
          <p className="text-[10px] font-label text-slate-500 uppercase tracking-wider mb-2">Affected Sectors</p>
          <div className="flex flex-wrap gap-1.5">
            {event.affected_sectors.map((sector) => (
              <span key={sector} className="text-[10px] font-label bg-primary/5 border border-primary/20 text-primary px-2 py-0.5 rounded-full">
                {sector}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
