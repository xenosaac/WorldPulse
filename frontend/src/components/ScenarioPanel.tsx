'use client';
import { useState } from 'react';
import { simulateScenario } from '@/lib/api';
import type { ScenarioResult } from '@/lib/types';

interface ScenarioPanelProps {
  chainId: string | null;
  onResult: (result: ScenarioResult) => void;
}

const PRESETS = [
  'China blockades Taiwan',
  'Iran closes Strait of Hormuz',
  'Suez Canal blocked 2 weeks',
  'Earthquake hits TSMC region',
];

export default function ScenarioPanel({ chainId, onResult }: ScenarioPanelProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScenarioResult | null>(null);

  const handleSubmit = async (scenario?: string) => {
    const text = scenario || input.trim();
    if (!text || !chainId) return;
    setInput(text);
    setLoading(true);
    try {
      const res = await simulateScenario(text, chainId);
      setResult(res);
      onResult(res);
    } catch (err) {
      console.error('Scenario simulation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-3 pt-3">
      <span className="text-xs font-light text-slate-300">Scenario simulator</span>

      <div className="space-y-3">
        {/* Preset chips */}
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => handleSubmit(preset)}
              disabled={loading || !chainId}
              className="text-[9px] font-label bg-primary/5 border border-primary/20 text-primary px-2 py-1 rounded-full hover:bg-primary/10 transition-colors disabled:opacity-30"
            >
              {preset}
            </button>
          ))}
        </div>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Or type a custom scenario..."
          className="w-full bg-slate-800/50 border border-white/5 rounded text-xs py-2 px-3 focus:ring-1 focus:ring-primary focus:border-transparent placeholder:text-slate-600 transition-colors text-slate-200 outline-none"
        />
        <button
          onClick={() => handleSubmit()}
          disabled={loading || !chainId}
          className={`w-full py-2 border border-primary text-primary text-[10px] font-label font-medium tracking-widest uppercase rounded hover:bg-primary/5 transition-colors disabled:opacity-30 ${loading ? 'btn-loading' : ''}`}
        >
          {loading ? 'Simulating...' : 'Run scenario'}
        </button>

        {!chainId && <p className="text-[10px] text-slate-600">Load a supply chain first</p>}

        {loading && (
          <div className="p-3 bg-slate-800/30 rounded-lg space-y-2">
            <div className="flex justify-between items-center mb-2">
              <div className="skeleton h-3 w-16" />
              <div className="skeleton h-3 w-14" />
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="skeleton h-3 w-24" />
                <div className="skeleton h-3 w-12" />
              </div>
            ))}
          </div>
        )}

        {!loading && result && (
          <div className="p-3 bg-slate-800/30 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[9px] font-label uppercase text-slate-500">Sim impact</span>
              <span className="text-red-500 text-[9px] font-bold uppercase">{result.overall_risk}</span>
            </div>
            <div className="space-y-1">
              {(result.impact_chain as any[])?.map((impact, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-[11px] font-light text-slate-400">
                    {impact.node_name || impact.node || `Node ${i + 1}`}
                  </span>
                  <span className="text-[11px] data-mono text-primary">
                    {impact.cost_change_percent != null ? `+${impact.cost_change_percent}%` : impact.impact_severity || ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
