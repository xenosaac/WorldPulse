'use client';
import { useState } from 'react';
import { generateBrief } from '@/lib/api';
import type { RiskBrief as RiskBriefType } from '@/lib/types';
import { useToast } from '@/components/Toast';

interface RiskBriefProps {
  chainId: string | null;
  scenarioId: string | null;
  onBriefComplete?: () => void;
}

const RISK_COLOR: Record<string, string> = {
  critical: 'text-red-500',
  high: 'text-orange-500',
  elevated: 'text-yellow-500',
  normal: 'text-green-500',
};

export default function RiskBrief({ chainId, scenarioId, onBriefComplete }: RiskBriefProps) {
  const { toast } = useToast();
  const [brief, setBrief] = useState<RiskBriefType | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!chainId) return;
    setLoading(true);
    try {
      const res = await generateBrief(chainId, scenarioId || undefined);
      setBrief(res);
      onBriefComplete?.();
    } catch (err) {
      toast('Brief generation failed. Check your connection.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-3 pt-3">
      <span className="text-xs font-light text-slate-300">Risk brief</span>

      <button
        onClick={handleGenerate}
        disabled={loading || !chainId}
        className={`w-full py-2 border border-primary text-primary text-[10px] font-label font-medium tracking-widest uppercase rounded hover:bg-primary/5 transition-colors disabled:opacity-30 ${loading ? 'btn-loading' : ''}`}
      >
        {loading ? 'Generating...' : 'Generate risk brief'}
      </button>

      {!chainId && <p className="text-[10px] text-slate-600">Load a supply chain first</p>}

      {loading && (
        <div className="space-y-3">
          <div className="p-3 bg-slate-800/20 border-l border-primary/30 rounded-r space-y-2">
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-[90%]" />
            <div className="skeleton h-3 w-[75%]" />
          </div>
          <div className="space-y-1">
            <div className="skeleton h-2 w-16 mb-2" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between">
                <div className="skeleton h-3 w-20" />
                <div className="skeleton h-3 w-14" />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-primary/30 mt-1.5 shrink-0" />
                <div className="skeleton h-3 w-full" />
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && brief && (
        <div className="space-y-4">
          {/* 1. Executive Summary */}
          {brief.executive_summary && (
            <div>
              <p className="text-[9px] font-label text-slate-500 uppercase tracking-wider mb-1">Executive Summary</p>
              <div className="p-3 bg-slate-800/20 border-l border-primary/30 rounded-r">
                <p className="text-[10px] font-light text-slate-300 leading-relaxed whitespace-pre-line">
                  {brief.executive_summary}
                </p>
              </div>
            </div>
          )}

          {/* 2. Risk Matrix */}
          {brief.risk_matrix && brief.risk_matrix.length > 0 && (
            <div>
              <p className="text-[9px] font-label text-slate-500 uppercase tracking-wider mb-1">Risk Matrix</p>
              <div className="space-y-0.5">
                {(brief.risk_matrix as any[]).map((row, i) => (
                  <div key={i} className="p-2 bg-slate-800/20 rounded">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-light text-slate-300">{row.node_name}</span>
                      <span className={`data-mono text-[9px] uppercase font-bold ${RISK_COLOR[row.risk_level] || 'text-slate-500'}`}>
                        {row.risk_level}
                      </span>
                    </div>
                    {row.primary_threat && (
                      <p className="text-[9px] text-slate-500">{row.primary_threat}</p>
                    )}
                    {row.mitigation && (
                      <p className="text-[9px] text-primary/70 mt-0.5">{row.mitigation}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Scenario Analysis */}
          {brief.scenario_analysis && (
            <div>
              <p className="text-[9px] font-label text-slate-500 uppercase tracking-wider mb-1">Scenario Analysis</p>
              <p className="text-[10px] font-light text-slate-400 leading-relaxed">{brief.scenario_analysis}</p>
            </div>
          )}

          {/* 4. Recommendations */}
          {brief.recommendations && brief.recommendations.length > 0 && (
            <div>
              <p className="text-[9px] font-label text-slate-500 uppercase tracking-wider mb-1">Recommendations</p>
              <ul className="space-y-1.5">
                {brief.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span className="text-[10px] leading-relaxed text-slate-400">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 5. Key Indicators */}
          {brief.key_indicators && brief.key_indicators.length > 0 && (
            <div>
              <p className="text-[9px] font-label text-slate-500 uppercase tracking-wider mb-1">Key Indicators to Watch</p>
              <ul className="space-y-1">
                {brief.key_indicators.map((ind, i) => (
                  <li key={i} className="text-[10px] text-slate-500 data-mono">
                    {ind}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
