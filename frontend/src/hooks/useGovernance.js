import { useContext } from 'react';
import { GovernanceContext } from '../context/GovernanceContext';

export default function useGovernance() {
  const ctx = useContext(GovernanceContext);
  if (!ctx) throw new Error('useGovernance must be used within a GovernanceProvider');
  return ctx;
}
