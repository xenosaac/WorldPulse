'use client';
import { useEffect, useRef } from 'react';
import type { Event, SupplyChainNode } from '@/lib/types';

// TODO: Implement react-globe.gl visualization
// - Render 3D globe with dark theme
// - Show event markers (colored by severity: low=green, medium=yellow, high=orange, critical=red)
// - Show supply chain arcs (golden lines connecting nodes)
// - Auto-rotate to new events via globe.pointOfView()
// - Click event marker to show EventCard

interface GlobeProps {
  events: Event[];
  supplyChainNodes: SupplyChainNode[];
  selectedEvent: Event | null;
  onEventClick: (event: Event) => void;
}

export default function Globe({ events, supplyChainNodes, selectedEvent, onEventClick }: GlobeProps) {
  const globeRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={globeRef} className="w-full h-full bg-gray-900 rounded-lg flex items-center justify-center">
      <div className="text-center text-gray-400">
        <div className="text-4xl mb-2">🌍</div>
        <p className="text-lg font-medium">Globe Component</p>
        <p className="text-sm">TODO: Implement react-globe.gl</p>
        <p className="text-xs mt-2">{events.length} events | {supplyChainNodes.length} supply chain nodes</p>
      </div>
    </div>
  );
}
