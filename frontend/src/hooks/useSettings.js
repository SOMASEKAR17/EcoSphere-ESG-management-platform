import { useContext } from 'react';
import { SettingsContext } from '../context/SettingsContext';

export default function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}
