'use client';
import { useState } from 'react';
import type { Event } from '@/lib/types';
import { analyzeVideo } from '@/lib/api';

interface VideoAnalysisProps {
  events: Event[];
  onEventDetected: (event: Event) => void;
  onAnalysisComplete?: () => void;
}

export default function VideoAnalysis({ events, onEventDetected, onAnalysisComplete }: VideoAnalysisProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState(0);
  const videoEventCount = events.filter((e) => e.source_type === 'video').length + extracted;

  const handleAnalyze = async () => {
    setLoading(true);
    setExtracted(0);
    try {
      const source = url.trim() || 'fallback';
      const result = await analyzeVideo(source === 'fallback' ? 'gs://demo/fallback' : source);
      result.events.forEach((evt) => onEventDetected(evt));
      setExtracted(result.events.length);
      onAnalysisComplete?.();
    } catch (err) {
      console.error('Video analysis failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-light text-slate-300">Video analysis</span>
        <span className="data-mono text-[9px] text-slate-500">{videoEventCount} EXTRACTED</span>
      </div>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
        placeholder="Paste YouTube URL or leave empty for demo"
        className="w-full bg-slate-800/50 border border-white/5 rounded text-xs py-2 px-3 focus:ring-1 focus:ring-primary focus:border-transparent placeholder:text-slate-600 transition-colors text-slate-200 outline-none"
      />
      <button
        onClick={handleAnalyze}
        disabled={loading}
        className={`w-full py-2.5 bg-primary text-slate-900 text-[11px] font-label font-medium tracking-widest uppercase rounded-lg hover:opacity-90 transition-all disabled:opacity-50 ${loading ? 'btn-loading' : ''}`}
      >
        {loading ? 'Analyzing...' : 'Analyze video'}
      </button>
      {extracted > 0 && !loading && (
        <p className="text-[10px] text-primary">{extracted} events extracted and added to globe</p>
      )}
    </section>
  );
}
