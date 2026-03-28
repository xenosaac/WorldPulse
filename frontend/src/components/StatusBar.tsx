'use client';

interface StatusBarProps {
  eventCount: number;
  geminiStatus: string;
}

export default function StatusBar({ eventCount, geminiStatus }: StatusBarProps) {
  const isActive = geminiStatus === 'active' || geminiStatus === 'connected';

  return (
    <footer className="fixed bottom-0 left-0 w-full z-50 flex items-center px-4 justify-between bg-[#020617] h-[30px] border-t border-white/5">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-primary teal-pulse' : 'bg-slate-600'}`} />
          <span className="text-[9px] font-label tracking-tight text-primary/80">
            Gemini {isActive ? 'live' : 'idle'}
          </span>
        </div>
        {isActive && (
          <div className="flex items-end gap-[1px] h-2.5">
            {[40, 70, 50, 90, 30, 60, 40, 80].map((h, i) => (
              <div
                key={i}
                className="w-[1.5px] bg-primary"
                style={{
                  height: `${h}%`,
                  animation: `waveform ${0.8 + i * 0.1}s ease-in-out infinite alternate`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="data-mono text-[9px] text-slate-500 uppercase tracking-widest">
          {eventCount} Events detected
        </span>
      </div>
    </footer>
  );
}
