import { createContext, useState, useMemo } from 'react';
import { esgConfigToggles } from '../data/mockData';

export const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [toggles, setToggles] = useState(esgConfigToggles);

  const toggleOne = (id) =>
    setToggles((prev) => prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t)));

  const isEnabled = (id) => toggles.find((t) => t.id === id)?.enabled ?? false;

  const value = useMemo(() => ({ toggles, toggleOne, isEnabled }), [toggles]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
