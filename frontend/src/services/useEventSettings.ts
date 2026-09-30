import { useEffect, useState } from 'react';
import { api, apiMessage, ensureSettings } from './api';
import type { EventSettings } from '../types/api';

export function useEventSettings() {
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<EventSettings>('/settings')
      .then(({ data }) => setSettings(ensureSettings(data)))
      .catch((err) => setError(apiMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  return { settings, loading, error };
}
