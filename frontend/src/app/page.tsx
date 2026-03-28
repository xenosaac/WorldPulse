'use client';
import { useState, useRef } from 'react';
import Globe from '@/components/Globe';
import VideoAnalysis from '@/components/VideoAnalysis';
import SupplyChain from '@/components/SupplyChain';
import ScenarioPanel from '@/components/ScenarioPanel';
import RiskBrief from '@/components/RiskBrief';
import StatusBar from '@/components/StatusBar';
import EventCard from '@/components/EventCard';
import SoundManager from '@/components/SoundManager';
import { useEvents } from '@/hooks/useEvents';
import { useGeminiLive } from '@/hooks/useGeminiLive';
import { useVideoSync } from '@/hooks/useVideoSync';
import type { Event, SupplyChain as SupplyChainType, ScenarioResult } from '@/lib/types';

export default function Home() {
  const { events, loading, addEvent, refresh } = useEvents();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [chain, setChain] = useState<SupplyChainType | null>(null);
  const [scenarioResult, setScenarioResult] = useState<ScenarioResult | null>(null);
  const [briefComplete, setBriefComplete] = useState(false);
  const [muted, setMuted] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const { visibleEvents, isPlaying } = useVideoSync(events, videoRef);
  const { status: geminiStatus } = useGeminiLive();

  return (
    <div className="h-screen flex bg-[#020617]">
      {/* Left: Globe (fills remaining space) */}
      <main className="relative flex-1 h-full overflow-hidden">
        <Globe
          events={events}
          supplyChainNodes={chain?.nodes || []}
          selectedEvent={selectedEvent}
          onEventClick={setSelectedEvent}
        />

        {/* Floating Event Card */}
        {selectedEvent && (
          <div className="absolute top-8 left-8 z-20 w-80">
            <EventCard event={selectedEvent} onClose={() => setSelectedEvent(null)} />
          </div>
        )}
      </main>

      {/* Right: Panel Stack */}
      <aside className="h-[calc(100%-30px)] w-[320px] flex flex-col bg-slate-900 border-l border-white/5">
        {/* Header */}
        <header className="p-6 shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl font-light tracking-[0.15em] text-white uppercase">World Pulse</span>
            <div className="w-1.5 h-1.5 rounded-full bg-primary teal-pulse" />
          </div>
          <p className="text-[10px] font-label font-medium tracking-[0.1em] text-slate-500 uppercase">
            Global Intelligence Platform
          </p>
        </header>

        {/* Scrollable Panel Stack */}
        <nav className="flex-1 overflow-y-auto px-6 space-y-1 pb-8">
          <VideoAnalysis events={events} onEventDetected={addEvent} onAnalysisComplete={refresh} />
          <SupplyChain onChainLoaded={setChain} />
          <ScenarioPanel chainId={chain?.id || null} onResult={setScenarioResult} />
          <RiskBrief
            chainId={chain?.id || null}
            scenarioId={scenarioResult?.id || null}
            onBriefComplete={() => setBriefComplete(true)}
          />
        </nav>
      </aside>

      {/* Bottom: Status Bar */}
      <StatusBar eventCount={events.length} geminiStatus={geminiStatus} />

      {/* Non-visual audio */}
      <SoundManager
        eventCount={events.length}
        geminiActive={geminiStatus === 'active'}
        briefComplete={briefComplete}
        muted={muted}
      />
    </div>
  );
}
