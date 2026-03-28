'use client';

// TODO: Implement "Gemini is watching" status bar
// - Show waveform animation when Live API is active
// - Show event counter
// - Show connection status

interface StatusBarProps {
  eventCount: number;
  geminiStatus: string;
}

export default function StatusBar({ eventCount, geminiStatus }: StatusBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${geminiStatus === 'active' ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
        <span className="text-gray-400">
          {geminiStatus === 'active' ? 'GEMINI LIVE' : geminiStatus === 'stub' ? 'GEMINI (stub)' : 'GEMINI IDLE'}
        </span>
      </div>
      <div className="text-gray-400">
        {eventCount} events detected
      </div>
    </div>
  );
}
