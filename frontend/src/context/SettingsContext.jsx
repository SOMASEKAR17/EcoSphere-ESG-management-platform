import { createContext, useState, useCallback, useMemo, useEffect } from 'react';
import * as api from '../api/endpoints';

export const SettingsContext = createContext(null);

const nextToastId = (() => {
  let id = 0;
  return () => ++id;
})();

export function SettingsProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (message, variant = 'success') => {
      const id = nextToastId();
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => dismissToast(id), 4200);
    },
    [dismissToast]
  );

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const [configRes, prefsRes] = await Promise.allSettled([
          api.getESGConfig(),
          api.getNotificationPreferences(),
        ]);

        if (configRes.status === 'fulfilled') {
          setConfig(configRes.value.data);
        }
        if (prefsRes.status === 'fulfilled') {
          setPreferences(prefsRes.value.data);
        }
      } catch {
        // Fallback or leave as null
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const updateConfig = useCallback(
    async (updates) => {
      if (!config) return;
      try {
        const { data } = await api.updateESGConfig(updates);
        setConfig(data);
        pushToast('Configuration updated', 'success');
      } catch (err) {
        pushToast(err?.response?.data?.detail || 'Failed to update config', 'error');
      }
    },
    [config, pushToast]
  );

  const updatePreferences = useCallback(
    async (updates) => {
      if (!preferences) return;
      try {
        const { data } = await api.updateNotificationPreferences(updates);
        setPreferences(data);
        pushToast('Preferences updated', 'success');
      } catch (err) {
        pushToast(err?.response?.data?.detail || 'Failed to update preferences', 'error');
      }
    },
    [preferences, pushToast]
  );

  const value = useMemo(
    () => ({
      config,
      preferences,
      loading,
      toasts,
      dismissToast,
      updateConfig,
      updatePreferences,
    }),
    [config, preferences, loading, toasts, dismissToast, updateConfig, updatePreferences]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
