'use client';
import { useState } from 'react';
import { simulateScenario } from '@/lib/api';
import type { ScenarioResult } from '@/lib/types';

// TODO: P0 = text input scenario simulation
// TODO: P2 = voice input via useGeminiLive hook

interface ScenarioPanelProps {
  chainId: string | null;
  onResult: (result: ScenarioResult) => void;
}

export default function ScenarioPanel({ chainId, onResult }: ScenarioPanelProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScenarioResult | null>(null);

  const handleSubmit = async () => {
    if (!input.trim() || !chainId) return;
    setLoading(true);
    try {
      const res = await simulateScenario(input, chainId);
      setResult(res);
      onResult(res);
    } catch (err) {
      console.error('Scenario simulation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-white font-semibold mb-2">Scenario Simulator</h3>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder='e.g. "China blockades Taiwan for 30 days"'
        className="w-full bg-gray-700 text-white rounded p-2 text-sm resize-none h-20 placeholder-gray-500"
      />
      <button
        onClick={handleSubmit}
        disabled={loading || !chainId}
        className="mt-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm w-full disabled:opacity-50"
      >
        {loading ? 'Simulating...' : 'Run Scenario'}
      </button>
      {!chainId && <p className="text-gray-500 text-xs mt-1">Load a supply chain first</p>}
      {result && (
        <div className="mt-2 text-gray-300 text-sm">
          <p>Risk: {result.overall_risk}</p>
        </div>
      )}
    </div>
  );
}
