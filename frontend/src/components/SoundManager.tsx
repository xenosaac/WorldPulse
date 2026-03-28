'use client';
import { useEffect, useRef, useCallback } from 'react';

interface SoundManagerProps {
  eventCount: number;
  geminiActive: boolean;
  briefComplete: boolean;
  muted: boolean;
}

export default function SoundManager({ eventCount, geminiActive, briefComplete, muted }: SoundManagerProps) {
  const ctxRef = useRef<AudioContext | null>(null);
  const prevEventCountRef = useRef(0);
  const prevBriefCompleteRef = useRef(false);
  const humOscRef = useRef<OscillatorNode | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    return ctxRef.current;
  }, []);

  // Ping on new event
  useEffect(() => {
    if (muted) return;
    if (eventCount > prevEventCountRef.current && prevEventCountRef.current > 0) {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain).connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
    prevEventCountRef.current = eventCount;
  }, [eventCount, muted, getCtx]);

  // Chime on brief complete
  useEffect(() => {
    if (muted) return;
    if (briefComplete && !prevBriefCompleteRef.current) {
      const ctx = getCtx();
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain).connect(ctx.destination);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.4);
      });
    }
    prevBriefCompleteRef.current = briefComplete;
  }, [briefComplete, muted, getCtx]);

  // Ambient hum during Gemini active
  useEffect(() => {
    if (muted || !geminiActive) {
      if (humOscRef.current) {
        try { humOscRef.current.stop(); } catch { /* already stopped */ }
        humOscRef.current = null;
      }
      return;
    }
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 60;
    gain.gain.value = 0.02;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    humOscRef.current = osc;
    return () => {
      osc.stop();
      humOscRef.current = null;
    };
  }, [geminiActive, muted, getCtx]);

  // Cleanup AudioContext on unmount
  useEffect(() => {
    return () => {
      ctxRef.current?.close();
      ctxRef.current = null;
    };
  }, []);

  return null;
}
