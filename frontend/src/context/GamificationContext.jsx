import { createContext, useState, useCallback, useMemo, useEffect } from 'react';
import * as api from '../api/endpoints';
import {
  challenges as fallbackChallenges,
  badges as fallbackBadges,
  rewards as fallbackRewards,
} from '../data/mockData';

export const GamificationContext = createContext(null);

const nextToastId = (() => {
  let id = 0;
  return () => ++id;
})();

export function GamificationProvider({ children }) {
  const [xp, setXp] = useState(0);
  const [points, setPoints] = useState(0);
  const [level, setLevel] = useState(1);

  const [challenges, setChallenges] = useState([]);
  const [badges, setBadges] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
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

  // ---------- Fetch from API ----------
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [meRes, challengesRes, badgesRes, rewardsRes, leaderboardRes] = await Promise.allSettled([
          api.getMe(),
          api.getChallenges(),
          api.getMyBadges(),
          api.getRewards(),
          api.getLeaderboard(),
        ]);

        if (meRes.status === 'fulfilled') {
          setXp(meRes.value.data.xp_balance || 0);
          setPoints(meRes.value.data.points_balance || 0);
          setLevel(Math.floor((meRes.value.data.xp_balance || 0) / 100) + 1);
        }

        setChallenges(
          challengesRes.status === 'fulfilled'
            ? challengesRes.value.data.map((c) => ({
                id: c.id,
                title: c.title,
                description: c.description,
                xp: c.xp_reward,
                points: c.xp_reward,
                progress: 0, // Should be joined from participation, but simplifying for frontend
                status: c.status || 'Active',
                deadline: c.deadline,
              }))
            : fallbackChallenges
        );

        setBadges(
          badgesRes.status === 'fulfilled'
            ? badgesRes.value.data.map((b) => ({
                id: b.badge_id,
                name: b.badge?.name || 'Badge',
                description: b.badge?.description || '',
                icon: b.badge?.icon_url || 'award',
                unlockedAt: b.awarded_at,
              }))
            : fallbackBadges.filter((b) => b.unlocked)
        );

        setRewards(
          rewardsRes.status === 'fulfilled'
            ? rewardsRes.value.data.map((r) => ({
                id: r.id,
                name: r.name,
                description: r.description,
                pointsRequired: r.points_required,
                icon: 'gift',
                stock: r.stock_count,
              }))
            : fallbackRewards
        );

        setLeaderboard(
          leaderboardRes.status === 'fulfilled'
            ? leaderboardRes.value.data.map((l) => ({
                rank: l.rank,
                name: `${l.first_name} ${l.last_name}`,
                score: l.xp_balance,
                department: `Dept ${l.department_id}`,
                isCurrentUser: false, // Could map via meRes ID
              }))
            : []
        );
      } catch {
        setChallenges(fallbackChallenges);
        setBadges(fallbackBadges);
        setRewards(fallbackRewards);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const awardXP = useCallback(
    (amount, reason) => {
      setXp((prev) => {
        const next = prev + amount;
        const newLevel = Math.floor(next / 100) + 1;
        if (newLevel > Math.floor(prev / 100) + 1) {
          pushToast(`Level Up! You are now Level ${newLevel} 🎉`, 'badge');
          setLevel(newLevel);
        }
        return next;
      });
      setPoints((prev) => prev + amount); // Simulating 1 XP = 1 Point
      pushToast(`+${amount} XP: ${reason}`, 'badge');
    },
    [pushToast]
  );

  const redeemReward = useCallback(
    async (reward) => {
      try {
        await api.redeemReward(reward.id);
        setPoints((prev) => prev - reward.pointsRequired);
        setRewards((prev) =>
          prev.map((r) => (r.id === reward.id ? { ...r, stock: r.stock - 1 } : r))
        );
        pushToast(`Redeemed "${reward.name}"!`, 'badge');
      } catch (err) {
        pushToast(err?.response?.data?.detail || 'Failed to redeem reward', 'error');
      }
    },
    [pushToast]
  );

  const joinChallenge = useCallback(
    async (id) => {
      try {
        await api.joinChallenge(id);
        setChallenges((prev) => prev.map((c) => (c.id === id ? { ...c, progress: 1 } : c)));
        pushToast('Joined challenge!', 'badge');
      } catch (err) {
        pushToast(err?.response?.data?.detail || 'Failed to join challenge', 'error');
      }
    },
    [pushToast]
  );

  const value = useMemo(
    () => ({
      xp, points, level,
      challenges, badges, rewards, leaderboard,
      loading, toasts, dismissToast,
      awardXP, redeemReward, joinChallenge,
    }),
    [
      xp, points, level,
      challenges, badges, rewards, leaderboard,
      loading, toasts, dismissToast,
      awardXP, redeemReward, joinChallenge,
    ]
  );

  return <GamificationContext.Provider value={value}>{children}</GamificationContext.Provider>;
}
