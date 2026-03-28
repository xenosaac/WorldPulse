'use client';
import { useState, useCallback, useRef } from 'react';
import type { WSMessage } from '@/lib/types';

// TODO: Implement Live API WebSocket connection for voice features (P2)
export function useGeminiLive() {
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState<string>('idle');
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    // TODO: Open WebSocket to ws://localhost:8000/ws/voice
    // Handle typed JSON envelope messages: audio, tool_call, transcript, session
    console.log('TODO: Implement Live API WebSocket connection');
    setStatus('stub');
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    setIsConnected(false);
    setStatus('idle');
  }, []);

  const sendAudio = useCallback((audioData: string) => {
    // TODO: Send audio chunk as {type: 'audio', data: base64}
    console.log('TODO: Send audio chunk');
  }, []);

  return { connect, disconnect, sendAudio, isConnected, transcript, status };
}
