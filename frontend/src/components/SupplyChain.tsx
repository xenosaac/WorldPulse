'use client';
import { useState, useEffect } from 'react';
import type { SupplyChain as SupplyChainType } from '@/lib/types';
import { getSupplyChains, addSupplyChainNode, deleteSupplyChainNode } from '@/lib/api';

interface SupplyChainProps {
  onChainLoaded: (chain: SupplyChainType) => void;
}

const DOT_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  elevated: 'bg-yellow-500',
  normal: 'bg-green-500',
};

const RISK_COLORS: Record<string, string> = {
  critical: 'text-red-500',
  high: 'text-orange-500',
  elevated: 'text-yellow-500',
  normal: 'text-green-500',
};

export default function SupplyChain({ onChainLoaded }: SupplyChainProps) {
  const [chains, setChains] = useState<SupplyChainType[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  const chain = chains[selectedIdx] || null;

  // Auto-load on mount
  useEffect(() => {
    getSupplyChains().then((data) => {
      setChains(data);
      if (data.length > 0) onChainLoaded(data[0]);
    }).catch(console.error);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const switchChain = (idx: number) => {
    setSelectedIdx(idx);
    if (chains[idx]) onChainLoaded(chains[idx]);
  };

  const refreshChains = async () => {
    const data = await getSupplyChains();
    setChains(data);
    if (data[selectedIdx]) onChainLoaded(data[selectedIdx]);
  };

  const handleAddNode = async () => {
    if (!chain || !newName.trim()) return;
    setAdding(true);
    try {
      await addSupplyChainNode(chain.id, newName.trim());
      setNewName('');
      setShowAdd(false);
      await refreshChains();
    } catch (err) {
      console.error('Failed to add node:', err);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    try {
      await deleteSupplyChainNode(nodeId);
      await refreshChains();
    } catch (err) {
      console.error('Failed to delete node:', err);
    }
  };

  if (chains.length === 0) {
    return (
      <section className="space-y-3 pt-3">
        <span className="text-xs font-light text-slate-300">Supply chain</span>
        <div className="flex items-center gap-2">
          <div className="skeleton h-3 w-3 rounded-full" />
          <div className="skeleton h-3 w-32" />
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3 pt-3">
      <span className="text-xs font-light text-slate-300">Supply chain</span>

      {/* Chain switcher tabs */}
      <div className="flex gap-1">
        {chains.map((c, i) => (
          <button
            key={c.id}
            onClick={() => switchChain(i)}
            className={`text-[9px] font-label px-2 py-1 rounded transition-colors ${
              i === selectedIdx
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'bg-slate-800/30 text-slate-500 border border-white/5 hover:text-slate-300'
            }`}
          >
            {c.name.split('(')[0].trim()}
          </button>
        ))}
      </div>

      {chain && (
        <div className="bg-slate-800/30 rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-white/5 flex justify-between items-center">
            <p className="text-[9px] font-label text-slate-500 uppercase truncate">
              {chain.nodes.map((n) => n.name.split(' ')[0]).join(' → ')}
            </p>
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="text-primary text-[11px] hover:text-primary/80"
            >
              {showAdd ? '−' : '+'}
            </button>
          </div>

          {/* Add node — just type a name, AI geocodes */}
          {showAdd && (
            <div className="px-3 py-2 border-b border-white/5 space-y-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddNode()}
                placeholder="Type location (e.g. Beijing, Strait of Hormuz)"
                className="w-full bg-slate-800/50 border border-white/5 rounded text-[10px] py-1.5 px-2 text-slate-200 placeholder:text-slate-600 outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={handleAddNode}
                disabled={adding || !newName.trim()}
                className={`w-full py-1.5 bg-primary text-slate-900 text-[10px] font-label rounded hover:opacity-90 disabled:opacity-50 ${adding ? 'btn-loading' : ''}`}
              >
                {adding ? 'Locating...' : 'Add node'}
              </button>
            </div>
          )}

          <div className="flex flex-col">
            {chain.nodes.map((node) => (
              <div key={node.id} className="order-book-row px-3 py-2 flex items-center justify-between group">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${DOT_COLORS[node.risk_level] || 'bg-green-500'}`} />
                  <span className="text-[11px] font-light text-slate-300">{node.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`data-mono text-[10px] uppercase ${RISK_COLORS[node.risk_level] || 'text-green-500'}`}>
                    {node.risk_level}
                  </span>
                  <button
                    onClick={() => handleDeleteNode(node.id)}
                    className="text-slate-600 hover:text-red-400 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
