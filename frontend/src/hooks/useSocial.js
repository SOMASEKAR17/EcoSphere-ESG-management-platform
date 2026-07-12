import { useContext } from 'react';
import { SocialContext } from '../context/SocialContext';

export default function useSocial() {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error('useSocial must be used within a SocialProvider');
  return ctx;
}
