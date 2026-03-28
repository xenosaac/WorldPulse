'use client';
import { useEffect, useRef, useState } from 'react';
import Globe from '@/components/Globe';
import VideoAnalysis from '@/components/VideoAnalysis';
import SupplyChain from '@/components/SupplyChain';
import ScenarioPanel from '@/components/ScenarioPanel';
import RiskBrief from '@/components/RiskBrief';
import StatusBar from '@/components/StatusBar';
import EventCard from '@/components/EventCard';
import SoundManager from '@/components/SoundManager';
import MacroIndicators from '@/components/MacroIndicators';
import EventTimeline from '@/components/EventTimeline';
import { ToastProvider } from '@/components/Toast';
import { useEvents } from '@/hooks/useEvents';
import { useGeminiLive } from '@/hooks/useGeminiLive';
import type { Event, SupplyChain as SupplyChainType, ScenarioResult } from '@/lib/types';

const RISK_LEVELS = new Set(['normal', 'elevated', 'high', 'critical']);
const RISK_ALIASES: Record<string, string> = {
  low: 'normal',
  medium: 'elevated',
  moderate: 'elevated',
  severe: 'high',
};

function getRiskLevel(value: unknown): string | null {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (RISK_LEVELS.has(normalized)) return normalized;
    if (normalized in RISK_ALIASES) return RISK_ALIASES[normalized];

    const numeric = Number(normalized);
    if (!Number.isNaN(numeric)) {
      return getRiskLevel(numeric);
    }
    return null;
  }

  if (typeof value === 'number') {
    if (value >= 80) return 'critical';
    if (value >= 60) return 'high';
    if (value >= 30) return 'elevated';
    return 'normal';
  }

  return null;
}

export default function Home() {
  const { events, addEvent, refresh } = useEvents();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [chain, setChain] = useState<SupplyChainType | null>(null);
  const [scenarioResult, setScenarioResult] = useState<ScenarioResult | null>(null);
  const [briefComplete, setBriefComplete] = useState(false);
  const processedToolCallsRef = useRef(0);

  const handleChainLoaded = (newChain: SupplyChainType) => {
    setChain(newChain);
    setScenarioResult(null);
    setBriefComplete(false);
  };

  const handleScenarioResult = (result: ScenarioResult) => {
    setScenarioResult(result);
    setChain((currentChain) => {
      if (!currentChain || !Array.isArray(result.impact_chain)) return currentChain;

      let changed = false;
      const impacts = result.impact_chain as Record<string, unknown>[];
      const updatedNodes = currentChain.nodes.map((node) => {
        const impact = impacts.find(
          (item) => item.node_name === node.name || item.node === node.name
        );
        const riskLevel = impact
          ? getRiskLevel(impact.risk_level) ?? getRiskLevel(impact.impact_severity)
          : null;
        if (!riskLevel || riskLevel === node.risk_level) return node;
        changed = true;
        return { ...node, risk_level: riskLevel };
      });

      return changed ? { ...currentChain, nodes: updatedNodes } : currentChain;
    });
  };

  const [muted] = useState(false);
  const {
    status: geminiStatus,
    connect,
    disconnect,
    startScenario,
    startRecording,
    stopRecording,
    isConnected,
    isRecording,
    transcript,
    toolCalls,
  } = useGeminiLive();

  useEffect(() => {
    if (toolCalls.length < processedToolCallsRef.current) {
      processedToolCallsRef.current = 0;
    }
    if (toolCalls.length === processedToolCallsRef.current) return;

    const newToolCalls = toolCalls.slice(processedToolCallsRef.current);
    processedToolCallsRef.current = toolCalls.length;

    const riskUpdates = new Map<string, string>();
    for (const toolCall of newToolCalls) {
      if (toolCall.name !== 'update_supply_chain_risk') continue;
      const nodeName = typeof toolCall.args.node_name === 'string' ? toolCall.args.node_name.trim().toLowerCase() : '';
      const riskLevel = getRiskLevel(toolCall.args.risk_level);
      if (nodeName && riskLevel) {
        riskUpdates.set(nodeName, riskLevel);
      }
    }

    if (riskUpdates.size === 0) return;

    setChain((currentChain) => {
      if (!currentChain) return currentChain;

      let changed = false;
      const updatedNodes = currentChain.nodes.map((node) => {
        const nextRiskLevel = riskUpdates.get(node.name.trim().toLowerCase());
        if (!nextRiskLevel || nextRiskLevel === node.risk_level) return node;
        changed = true;
        return { ...node, risk_level: nextRiskLevel };
      });

      return changed ? { ...currentChain, nodes: updatedNodes } : currentChain;
    });
  }, [toolCalls]);

  return (
    <ToastProvider>
      <div className="h-screen flex bg-[#020617]">
        {/* Left: Globe */}
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
            <SupplyChain onChainLoaded={handleChainLoaded} />

            {/* Only show these after supply chain loads */}
            {chain && (
              <>
                <MacroIndicators />
                <EventTimeline events={events} onEventClick={setSelectedEvent} selectedEvent={selectedEvent} />
                <ScenarioPanel chainId={chain.id} onResult={handleScenarioResult} />
                <RiskBrief
                  chainId={chain.id}
                  scenarioId={scenarioResult?.id || null}
                  onBriefComplete={() => setBriefComplete(true)}
                />

                {/* Voice / Live API */}
                <section className="space-y-2 pt-3">
                  <span className="text-xs font-light text-slate-300">Voice assistant</span>
                  {!isConnected ? (
                    <button
                      onClick={connect}
                      className="w-full py-2 border border-primary text-primary text-[10px] font-label font-medium tracking-widest uppercase rounded hover:bg-primary/5 transition-colors"
                    >
                      Connect Gemini Live
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary teal-pulse" />
                        <span className="text-[10px] text-primary capitalize">{geminiStatus}</span>
                      </div>
                      <button
                        onClick={() => startScenario(chain.id)}
                        disabled={geminiStatus === 'connecting'}
                        className="w-full py-2 bg-primary/10 text-primary text-[10px] font-label rounded hover:bg-primary/20 transition-colors disabled:opacity-50"
                      >
                        {geminiStatus === 'connecting' ? 'Starting session...' : 'Start voice scenario'}
                      </button>
                      <div className="grid grid-cols-1 gap-2">
                        <button
                          onClick={isRecording ? stopRecording : startRecording}
                          disabled={geminiStatus !== 'active'}
                          className="w-full py-2 border border-primary/30 text-primary text-[10px] font-label rounded hover:bg-primary/5 transition-colors disabled:opacity-40"
                        >
                          {isRecording ? 'Stop mic' : 'Start mic'}
                        </button>
                      </div>
                      {(isRecording || transcript || toolCalls.length > 0) && (
                        <div className="rounded border border-white/5 bg-slate-800/30 px-3 py-2 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-label uppercase text-slate-500">Live trace</span>
                            <span className="text-[9px] data-mono text-slate-500">
                              {toolCalls.length} updates
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-relaxed">
                            {transcript || (isRecording ? 'Listening for scenario input...' : 'Waiting for Gemini response...')}
                          </p>
                        </div>
                      )}
                      <button
                        onClick={disconnect}
                        className="w-full py-1.5 text-slate-500 text-[10px] font-label rounded hover:text-slate-300 transition-colors"
                      >
                        Disconnect
                      </button>
                    </div>
                  )}
                </section>
              </>
            )}
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
    </ToastProvider>
  );
}
