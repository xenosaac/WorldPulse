'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import type { WSMessage } from '@/lib/types';
import { getWebSocketUrl } from '@/lib/api';

export type GeminiLiveStatus = 'idle' | 'connecting' | 'connected' | 'active' | 'error' | 'complete';

interface ToolCallEvent {
  name: string;
  args: Record<string, unknown>;
}

export function useGeminiLive() {
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState<GeminiLiveStatus>('idle');
  const [toolCalls, setToolCalls] = useState<ToolCallEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

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
        console.error('Failed to parse WebSocket message');
        return;
      }

      if (msg.type === 'session') {
        const s = msg.status as GeminiLiveStatus;
        setStatus(s);
        if (s === 'active') setIsConnected(true);
        if (s === 'error' || s === 'complete') setIsConnected(false);
      } else if (msg.type === 'transcript') {
        setTranscript((prev) => prev + msg.text);
      } else if (msg.type === 'tool_call') {
        setToolCalls((prev) => [...prev, { name: msg.name, args: msg.args }]);
      } else if (msg.type === 'audio') {
        playAudioChunk(msg.data);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setStatus('idle');
    };

    ws.onerror = () => {
      setStatus('error');
    };
  }, []);

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
  }, []);

  const startScenario = useCallback((chainId: string) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    setTranscript('');
    setToolCalls([]);
    wsRef.current.send(JSON.stringify({ type: 'start_scenario', chain_id: chainId }));
  }, []);

  const startBriefing = useCallback((chainId: string, scenarioId?: string) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    setTranscript('');
    setToolCalls([]);
    wsRef.current.send(
      JSON.stringify({ type: 'start_briefing', chain_id: chainId, scenario_id: scenarioId })
    );
  }, []);

  const sendAudio = useCallback((audioData: string) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'audio', data: audioData }));
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          const buffer = await event.data.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          sendAudio(btoa(binary));
        }
      };

      mediaRecorder.start(250); // send chunks every 250ms
    } catch (err) {
      console.error('Failed to start recording:', err);
      setStatus('error');
    }
  }, [sendAudio]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current = null;
    }
  }, []);

  const playAudioChunk = (base64: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      audioContextRef.current
        .decodeAudioData(bytes.buffer.slice(0))
        .then((audioBuffer) => {
          const source = audioContextRef.current!.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioContextRef.current!.destination);
          source.start();
        })
        .catch(() => {
          /* ignore decode errors for raw PCM chunks */
        });
    } catch {
      /* ignore */
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      wsRef.current?.close();
      audioContextRef.current?.close();
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
    transcript,
    status,
    toolCalls,
  };
}
