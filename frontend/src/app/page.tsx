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
    <div className="h-screen flex flex-col">
      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Globe */}
        <div className="flex-1 relative">
          <Globe
            events={events}
            supplyChainNodes={chain?.nodes || []}
            selectedEvent={selectedEvent}
            onEventClick={setSelectedEvent}
          />
          {selectedEvent && (
            <div className="absolute top-4 left-4 w-80 z-10">
              <EventCard event={selectedEvent} onClose={() => setSelectedEvent(null)} />
            </div>
          )}
        </div>

        {/* Right: Panels */}
        <div className="w-80 bg-gray-900 border-l border-gray-800 overflow-y-auto p-4 space-y-4">
          <h1 className="text-xl font-bold text-white">World Pulse</h1>
          {loading && <p className="text-gray-500 text-sm">Loading events...</p>}

          <VideoAnalysis events={events} onEventDetected={addEvent} />
          <SupplyChain onChainLoaded={setChain} />
          <ScenarioPanel chainId={chain?.id || null} onResult={setScenarioResult} />
          <RiskBrief chainId={chain?.id || null} scenarioId={scenarioResult?.id || null} />
        </div>
      </div>

      {/* Bottom: Status Bar */}
      <StatusBar eventCount={events.length} geminiStatus={geminiStatus} />

      {/* Non-visual audio component */}
      <SoundManager
        eventCount={events.length}
        geminiActive={geminiStatus === 'active'}
        briefComplete={briefComplete}
        muted={muted}
      />
    </div>
  );
}
