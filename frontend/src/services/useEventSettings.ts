import { useCallback, useEffect, useState } from 'react';
import { api, apiMessage, ensureSettings } from './api';
import type { EventSettings } from '../types/api';

export type EventSettingsState = ReturnType<typeof useEventSettings>;

export function useEventSettings({ refreshIntervalMs = 0 }: { refreshIntervalMs?: number } = {}) {
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [receivedAt, setReceivedAt] = useState(0);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((current) => current + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let pending = false;

    async function load() {
      if (pending || controller.signal.aborted) return;
      pending = true;
      try {
        const { data } = await api.get<EventSettings>('/settings', { signal: controller.signal });
        if (controller.signal.aborted) return;
        setSettings(ensureSettings(data));
        setReceivedAt(window.performance.now());
        setError('');
      } catch (err) {
        if (!controller.signal.aborted) setError(apiMessage(err));
      } finally {
        pending = false;
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    setLoading(true);
    void load();
    const loadWhenVisible = () => { if (!document.hidden) void load(); };
    const interval = refreshIntervalMs ? window.setInterval(loadWhenVisible, refreshIntervalMs) : undefined;
    if (refreshIntervalMs) document.addEventListener('visibilitychange', loadWhenVisible);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', loadWhenVisible);
    };
  }, [refreshIntervalMs, revision]);

  return { settings, loading, error, receivedAt, refresh };
}
