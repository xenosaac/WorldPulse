'use client';
import { useRef } from 'react';
import type { Event } from '@/lib/types';

// TODO: Implement split-screen video player with synced event display
// - Video player on the left
// - Events appear synced to video_timestamp as video plays
// - Event counter shows detected count
// - Uses useVideoSync hook

interface VideoAnalysisProps {
  events: Event[];
  onEventDetected: (event: Event) => void;
}

export default function VideoAnalysis({ events, onEventDetected }: VideoAnalysisProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-white font-semibold mb-2">Video Analysis</h3>
      <div className="text-gray-400 text-sm">
        <p>TODO: Split-screen video player + synced event extraction</p>
        <p className="mt-1">Events with video_timestamp: {events.filter(e => e.video_timestamp !== null).length}</p>
      </div>
    </div>
  );
}
