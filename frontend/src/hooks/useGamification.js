import { useContext } from 'react';
import { GamificationContext } from '../context/GamificationContext';

export default function useGamification() {
  const ctx = useContext(GamificationContext);
  if (!ctx) throw new Error('useGamification must be used within a GamificationProvider');
  return ctx;
}
