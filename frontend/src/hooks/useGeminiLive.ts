'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import type { WSMessage } from '@/lib/types';
import { getWebSocketUrl } from '@/lib/api';

export type GeminiLiveStatus = 'idle' | 'connecting' | 'connected' | 'active' | 'error' | 'complete';

interface ToolCallEvent {
  name: string;
  args: Record<string, unknown>;
}

/** State for raw PCM mic capture via Web Audio API. */
interface PcmCapture {
  stream: MediaStream;
  ctx: AudioContext;
  source: MediaStreamAudioSourceNode;
  processor: ScriptProcessorNode;
}

export function useGeminiLive() {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState<GeminiLiveStatus>('idle');
  const [toolCalls, setToolCalls] = useState<ToolCallEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const captureRef = useRef<PcmCapture | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);

  // ── Playback: raw PCM 16-bit LE mono from Gemini (24 kHz output) ──────────
  const playAudioChunk = useCallback((base64: string) => {
    try {
      if (!playbackCtxRef.current || playbackCtxRef.current.state === 'closed') {
        playbackCtxRef.current = new AudioContext({ sampleRate: 24000 });
      }
      const ctx = playbackCtxRef.current;
      const raw = atob(base64);
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;

      const buf = ctx.createBuffer(1, float32.length, 24000);
      buf.getChannelData(0).set(float32);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start();
    } catch {
      /* ignore decode errors */
    }
  }, []);

  // ── Send audio chunk over WebSocket ───────────────────────────────────────
  const sendAudio = useCallback((audioData: string) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'audio', data: audioData }));
  }, []);

  // ── Stop mic capture ──────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    const cap = captureRef.current;
    if (cap) {
      cap.processor.disconnect();
      cap.source.disconnect();
      cap.stream.getTracks().forEach((t) => t.stop());
      cap.ctx.close().catch(() => {});
    }
    captureRef.current = null;
    setIsRecording(false);
  }, []);

  // ── Start mic: capture raw 16-bit PCM at 16 kHz ──────────────────────────
  const startRecording = useCallback(async () => {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true },
      });

      const ctx = new AudioContext({ sampleRate: 16000 });
      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        const f32 = e.inputBuffer.getChannelData(0);
        const pcm = new Int16Array(f32.length);
        for (let i = 0; i < f32.length; i++) {
          const s = Math.max(-1, Math.min(1, f32[i]));
          pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        const bytes = new Uint8Array(pcm.buffer);
        let bin = '';
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        sendAudio(btoa(bin));
      };

      source.connect(processor);
      processor.connect(ctx.destination); // required for onaudioprocess to fire

      captureRef.current = { stream, ctx, source, processor };
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setStatus('error');
      setIsRecording(false);
    }
  }, [isRecording, sendAudio]);

  // ── WebSocket connect ─────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus('connecting');
    const ws = new WebSocket(getWebSocketUrl('/ws/voice'));
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setStatus('connected');
    };

    ws.onmessage = (evt) => {
      let msg: WSMessage;
      try {
        msg = JSON.parse(evt.data);
      } catch {
        return;
      }

      if (msg.type === 'session') {
        const s = msg.status as GeminiLiveStatus;
        setStatus(s);
        if (s === 'active' || s === 'connected') setIsConnected(true);
        if (s === 'error' || s === 'complete') {
          stopRecording();
          setIsConnected(s !== 'error');
        }
      } else if (msg.type === 'transcript') {
        setTranscript((prev) => prev + msg.text);
      } else if (msg.type === 'tool_call') {
        setToolCalls((prev) => [...prev, { name: msg.name, args: msg.args }]);
      } else if (msg.type === 'audio') {
        playAudioChunk(msg.data);
      }
    };

    ws.onclose = () => {
      stopRecording();
      setIsConnected(false);
      setStatus('idle');
    };

    ws.onerror = () => {
      stopRecording();
      setStatus('error');
    };
  }, [playAudioChunk, stopRecording]);

  const disconnect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop' }));
    }
    stopRecording();
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
    setStatus('idle');
    setTranscript('');
    setToolCalls([]);
  }, [stopRecording]);

  const startScenario = useCallback((chainId: string) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    stopRecording();
    setTranscript('');
    setToolCalls([]);
    wsRef.current.send(JSON.stringify({ type: 'start_scenario', chain_id: chainId }));
  }, [stopRecording]);

  const startBriefing = useCallback((chainId: string, scenarioId?: string) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    stopRecording();
    setTranscript('');
    setToolCalls([]);
    wsRef.current.send(
      JSON.stringify({ type: 'start_briefing', chain_id: chainId, scenario_id: scenarioId })
    );
  }, [stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      wsRef.current?.close();
      playbackCtxRef.current?.close();
    };
  }, [stopRecording]);

  return {
    connect,
    disconnect,
    startScenario,
    startBriefing,
    sendAudio,
    startRecording,
    stopRecording,
    isConnected,
    isRecording,
    transcript,
    status,
    toolCalls,
  };
}
