import { useContext } from 'react';
import { EnvironmentalContext } from '../context/EnvironmentalContext';

export default function useEnvironmental() {
  const ctx = useContext(EnvironmentalContext);
  if (!ctx) throw new Error('useEnvironmental must be used within an EnvironmentalProvider');
  return ctx;
}
