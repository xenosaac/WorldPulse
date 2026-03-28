'use client';
import { useState } from 'react';
import type { SupplyChain as SupplyChainType } from '@/lib/types';
import { getSupplyChains } from '@/lib/api';

// TODO: Implement supply chain panel
// - "Load Supply Chain" button
// - Fetches chain data from API
// - Triggers golden arcs on globe connecting nodes
// - Shows risk level per node

interface SupplyChainProps {
  onChainLoaded: (chain: SupplyChainType) => void;
}

export default function SupplyChain({ onChainLoaded }: SupplyChainProps) {
  const [chain, setChain] = useState<SupplyChainType | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLoad = async () => {
    setLoading(true);
    try {
      const chains = await getSupplyChains();
      if (chains.length > 0) {
        setChain(chains[0]);
        onChainLoaded(chains[0]);
      }
    } catch (err) {
      console.error('Failed to load supply chain:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-white font-semibold mb-2">Supply Chain</h3>
      {!chain ? (
        <button
          onClick={handleLoad}
          disabled={loading}
          className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Load Supply Chain'}
        </button>
      ) : (
        <div className="text-gray-300 text-sm">
          <p className="font-medium">{chain.name}</p>
          <p className="text-gray-400">{chain.nodes.length} nodes</p>
          {chain.nodes.map((node) => (
            <div key={node.id} className="mt-1 flex justify-between">
              <span>{node.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                node.risk_level === 'critical' ? 'bg-red-900 text-red-300' :
                node.risk_level === 'high' ? 'bg-orange-900 text-orange-300' :
                'bg-green-900 text-green-300'
              }`}>{node.risk_level}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
