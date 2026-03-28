'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { Event } from '@/lib/types';

export function useVideoSync(events: Event[], videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [visibleEvents, setVisibleEvents] = useState<Event[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const animFrameRef = useRef<number>(0);
  const revealedIdsRef = useRef<Set<string>>(new Set());
  const eventsRef = useRef(events);
  eventsRef.current = events;

  const tick = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.paused || video.ended) {
      setIsPlaying(false);
      return;
    }
    setIsPlaying(true);
    const currentTime = video.currentTime;

    const newEvents = eventsRef.current.filter(
      (e) =>
        e.video_timestamp != null &&
        e.video_timestamp <= currentTime &&
        !revealedIdsRef.current.has(e.id)
    );

    if (newEvents.length > 0) {
      for (const e of newEvents) {
        revealedIdsRef.current.add(e.id);
      }
      setVisibleEvents((prev) => [...prev, ...newEvents]);
    }

    animFrameRef.current = requestAnimationFrame(tick);
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => {
      setIsPlaying(true);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    const onSeeked = () => {
      const currentTime = video.currentTime;
      revealedIdsRef.current.clear();
      const visible = eventsRef.current.filter(
        (e) => e.video_timestamp != null && e.video_timestamp <= currentTime
      );
      for (const e of visible) revealedIdsRef.current.add(e.id);
      setVisibleEvents(visible);
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
    video.addEventListener('seeked', onSeeked);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('seeked', onSeeked);
    };
  }, [videoRef, tick]);

  return { visibleEvents, isPlaying };
}
