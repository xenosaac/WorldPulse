'use client';
import { useState, useEffect, useRef } from 'react';
import type { Event } from '@/lib/types';

// TODO: Implement video timestamp sync logic
// This hook should watch video.currentTime and reveal events
// whose video_timestamp <= currentTime
export function useVideoSync(events: Event[], videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [visibleEvents, setVisibleEvents] = useState<Event[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const animFrameRef = useRef<number>(0);

  // TODO: Implement requestAnimationFrame loop that:
  // 1. Reads videoRef.current.currentTime
  // 2. Filters events where video_timestamp <= currentTime
  // 3. Updates visibleEvents incrementally (add new ones, don't re-add existing)
  // 4. Stops when video ends or is paused

  return { visibleEvents, isPlaying };
}
