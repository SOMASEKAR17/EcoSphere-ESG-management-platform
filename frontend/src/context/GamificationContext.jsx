import { createContext, useState, useMemo, useCallback, useRef } from 'react';
import { challenges as initialChallenges, badges as badgeCatalog, initialUserStats } from '../data/mockData';
import { evaluateBadges, getNewlyEarnedBadges } from '../utils/gamification';
import useSettings from '../hooks/useSettings';

export const GamificationContext = createContext(null);

const nextToastId = (() => {
  let id = 0;
  return () => ++id;
})();

export function GamificationProvider({ children }) {
  const { isEnabled } = useSettings();
  const autoAwardBadges = isEnabled('autoBadges');

  const [challenges, setChallenges] = useState(initialChallenges);
  const [userStats, setUserStats] = useState(initialUserStats);
  const [redemptions, setRedemptions] = useState([]);
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

  // Kept in a ref so the "before" badge snapshot used for unlock detection
  // doesn't need its own render-triggering state.
  const prevBadgesRef = useRef(evaluateBadges(initialUserStats, badgeCatalog));

  const badges = useMemo(() => evaluateBadges(userStats, badgeCatalog), [userStats]);

  const checkForNewlyUnlockedBadges = useCallback(
    (nextStats) => {
      const nextBadges = evaluateBadges(nextStats, badgeCatalog);
      const newlyEarned = getNewlyEarnedBadges(prevBadgesRef.current, nextBadges);
      prevBadgesRef.current = nextBadges;

      if (autoAwardBadges) {
        newlyEarned.forEach((badge) => pushToast(`Badge unlocked: ${badge.name}!`, 'badge'));
      }
    },
    [autoAwardBadges, pushToast]
  );

  const setChallengeStatus = useCallback(
    (id, status) => {
      setChallenges((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    },
    []
  );

  const activateChallenge = useCallback((id) => setChallengeStatus(id, 'Active'), [setChallengeStatus]);
  const submitForReview = useCallback((id) => setChallengeStatus(id, 'Under Review'), [setChallengeStatus]);
  const archiveChallenge = useCallback((id) => setChallengeStatus(id, 'Archived'), [setChallengeStatus]);

  const approveAndComplete = useCallback(
    (id) => {
      const challenge = challenges.find((c) => c.id === id);
      if (!challenge) return;

      setChallengeStatus(id, 'Completed');

      const nextStats = {
        totalXP: userStats.totalXP + challenge.xp,
        completedChallenges: userStats.completedChallenges + 1,
      };
      setUserStats(nextStats);
      checkForNewlyUnlockedBadges(nextStats);
      pushToast(`"${challenge.name}" completed — +${challenge.xp} XP`, 'success');
    },
    [challenges, userStats, setChallengeStatus, checkForNewlyUnlockedBadges, pushToast]
  );

  // Generic XP award used by other modules (e.g. Social CSR/Training approvals)
  // so the demo can show a cross-module moment without those modules owning
  // XP/badge logic themselves.
  const awardXP = useCallback(
    (amount, label) => {
      if (!amount) return;
      const nextStats = { ...userStats, totalXP: userStats.totalXP + amount };
      setUserStats(nextStats);
      checkForNewlyUnlockedBadges(nextStats);
      pushToast(`+${amount} XP${label ? ` — ${label}` : ''}`, 'success');
    },
    [userStats, checkForNewlyUnlockedBadges, pushToast]
  );

  const redeemReward = useCallback(
    (reward) => {
      if (userStats.totalXP < reward.xpCost) {
        pushToast(`Not enough XP to redeem ${reward.name}`, 'error');
        return false;
      }

      setUserStats((prev) => ({ ...prev, totalXP: prev.totalXP - reward.xpCost }));
      setRedemptions((prev) => [
        { id: `${reward.id}-${Date.now()}`, name: reward.name, date: new Date().toLocaleDateString() },
        ...prev,
      ]);
      pushToast(`Redeemed: ${reward.name}`, 'success');
      return true;
    },
    [userStats, pushToast]
  );

  const value = useMemo(
    () => ({
      challenges,
      userStats,
      badges,
      redemptions,
      toasts,
      autoAwardBadges,
      activateChallenge,
      submitForReview,
      approveAndComplete,
      archiveChallenge,
      redeemReward,
      awardXP,
      dismissToast,
    }),
    [
      challenges,
      userStats,
      badges,
      redemptions,
      toasts,
      autoAwardBadges,
      activateChallenge,
      submitForReview,
      approveAndComplete,
      archiveChallenge,
      redeemReward,
      awardXP,
      dismissToast,
    ]
  );

  return <GamificationContext.Provider value={value}>{children}</GamificationContext.Provider>;
}
