'use client';
import { useState, useEffect, useCallback } from 'react';
import type { Event } from '@/lib/types';
import { getEvents } from '@/lib/api';

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getEvents()
      .then(setEvents)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const addEvent = useCallback((event: Event) => {
    setEvents((prev) => [...prev, event]);
  }, []);

  return { events, loading, error, addEvent };
}
