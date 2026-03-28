'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { Event, SupplyChainNode } from '@/lib/types';

const GlobeGL = dynamic(() => import('react-globe.gl'), { ssr: false });

interface GlobeProps {
  events: Event[];
  supplyChainNodes: SupplyChainNode[];
  selectedEvent: Event | null;
  onEventClick: (event: Event) => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
};

const RISK_COLORS: Record<string, string> = {
  normal: '#22c55e',
  elevated: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
};

export default function Globe({ events, supplyChainNodes, selectedEvent, onEventClick }: GlobeProps) {
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!globeRef.current) return;
    const globe = globeRef.current;
    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.4;
    globe.controls().enableZoom = true;
    globe.pointOfView({ lat: 20, lng: 100, altitude: 2.2 }, 0);
  }, [mounted]);

  useEffect(() => {
    if (!globeRef.current || !selectedEvent) return;
    globeRef.current.pointOfView(
      { lat: selectedEvent.lat, lng: selectedEvent.lng, altitude: 1.8 },
      1000
    );
  }, [selectedEvent]);

  const pointsData = events.map((e) => ({
    lat: e.lat,
    lng: e.lng,
    size: e.severity === 'critical' ? 0.6 : 0.35,
    color: SEVERITY_COLORS[e.severity] || '#94a3b8',
    event: e,
  }));

  const sortedNodes = [...supplyChainNodes].sort((a, b) => a.sort_order - b.sort_order);
  const arcsData = sortedNodes.slice(0, -1).map((node, i) => ({
    startLat: node.lat,
    startLng: node.lng,
    endLat: sortedNodes[i + 1].lat,
    endLng: sortedNodes[i + 1].lng,
    color: [RISK_COLORS[node.risk_level] || '#2dd4bf', RISK_COLORS[sortedNodes[i + 1].risk_level] || '#2dd4bf'],
  }));

  const handlePointClick = useCallback(
    (point: any) => {
      if (point?.event) onEventClick(point.event);
    },
    [onEventClick]
  );

  if (!mounted) {
    return (
      <div ref={containerRef} className="w-full h-full bg-[#020617] flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-primary teal-pulse" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full bg-[#020617] overflow-hidden">
      {dimensions.width > 0 && (
        <GlobeGL
          ref={globeRef}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="rgba(2, 6, 23, 0)"
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          atmosphereColor="#2dd4bf"
          atmosphereAltitude={0.2}
          pointsData={pointsData}
          pointLat="lat"
          pointLng="lng"
          pointRadius="size"
          pointColor="color"
          pointAltitude={0.01}
          onPointClick={handlePointClick}
          pointLabel={(d: any) => `<div style="background:rgba(15,23,42,0.85);backdrop-filter:blur(8px);padding:6px 10px;border-radius:6px;border:1px solid rgba(255,255,255,0.08);font-size:11px;color:#f1f5f9;font-family:Inter,sans-serif"><b>${d.event.title}</b><br/><span style="color:${d.color};text-transform:uppercase;font-size:9px;letter-spacing:1px">${d.event.severity}</span></div>`}
          arcsData={arcsData}
          arcStartLat="startLat"
          arcStartLng="startLng"
          arcEndLat="endLat"
          arcEndLng="endLng"
          arcColor="color"
          arcDashLength={0.4}
          arcDashGap={0.2}
          arcDashAnimateTime={2000}
          arcStroke={0.5}
          showGraticules={false}
        />
      )}
    </div>
  );
}
