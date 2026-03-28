'use client';
import { useState } from 'react';
import { generateBrief } from '@/lib/api';
import type { RiskBrief as RiskBriefType } from '@/lib/types';

// TODO: P0 = text-based risk brief display
// TODO: P2 = voice-narrated briefing via Live API

interface RiskBriefProps {
  chainId: string | null;
  scenarioId: string | null;
}

export default function RiskBrief({ chainId, scenarioId }: RiskBriefProps) {
  const [brief, setBrief] = useState<RiskBriefType | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!chainId) return;
    setLoading(true);
    try {
      const res = await generateBrief(chainId, scenarioId || undefined);
      setBrief(res);
    } catch (err) {
      console.error('Brief generation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-white font-semibold mb-2">Risk Brief</h3>
      <button
        onClick={handleGenerate}
        disabled={loading || !chainId}
        className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded text-sm w-full disabled:opacity-50"
      >
        {loading ? 'Generating...' : 'Generate Risk Brief'}
      </button>
      {!chainId && <p className="text-gray-500 text-xs mt-1">Load a supply chain first</p>}
      {brief && (
        <div className="mt-3 text-gray-300 text-sm space-y-2">
          <div>
            <h4 className="font-medium text-white">Executive Summary</h4>
            <p>{brief.executive_summary || 'TODO: Gemini synthesis'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
