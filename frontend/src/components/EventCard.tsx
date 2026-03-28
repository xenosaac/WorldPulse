'use client';
import type { Event } from '@/lib/types';

// TODO: Show full event detail with confidence score and evidence

interface EventCardProps {
  event: Event;
  onClose: () => void;
}

export default function EventCard({ event, onClose }: EventCardProps) {
  const severityColor = {
    low: 'border-green-500',
    medium: 'border-yellow-500',
    high: 'border-orange-500',
    critical: 'border-red-500',
  }[event.severity] || 'border-gray-500';

  return (
    <div className={`bg-gray-800 rounded-lg p-4 border-l-4 ${severityColor}`}>
      <div className="flex justify-between items-start">
        <h4 className="text-white font-medium">{event.title}</h4>
        <button onClick={onClose} className="text-gray-500 hover:text-white">&times;</button>
      </div>
      <p className="text-gray-400 text-sm mt-1">{event.description}</p>
      {event.confidence && (
        <div className="mt-2 text-xs text-gray-500">
          Confidence: {event.confidence}%
          {event.evidence && <span className="ml-2">| {event.evidence}</span>}
        </div>
      )}
      <div className="mt-2 flex gap-1 flex-wrap">
        {event.affected_sectors?.map((sector) => (
          <span key={sector} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{sector}</span>
        ))}
      </div>
    </div>
  );
}
