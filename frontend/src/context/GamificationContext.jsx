import { createContext, useState, useCallback, useMemo, useEffect } from 'react';
import * as api from '../api/endpoints';
import {
  challenges as fallbackChallenges,
  badges as fallbackBadges,
  rewards as fallbackRewards,
  leaderboardIndividual as fallbackLeaderboardIndividual,
  leaderboardDepartment as fallbackLeaderboardDepartment,
  initialUserStats,
} from '../data/mockData';

export const GamificationContext = createContext(null);

const nextToastId = (() => {
  let id = 0;
  return () => ++id;
})();

export function GamificationProvider({ children }) {
  const [userStats, setUserStats] = useState(initialUserStats);
  const [challenges, setChallenges] = useState([]);
  const [badges, setBadges] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [leaderboardIndividual, setLeaderboardIndividual] = useState(fallbackLeaderboardIndividual);
  const [leaderboardDepartment] = useState(fallbackLeaderboardDepartment);
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
        const [meRes, challengesRes, badgesRes, rewardsRes, leaderboardRes, redemptionsRes] =
          await Promise.allSettled([
            api.getMe(),
            api.getChallenges(),
            api.getBadges(),
            api.getRewards(),
            api.getLeaderboard(),
            api.getMyRedemptions(),
          ]);

        // --- User stats ---
        if (meRes.status === 'fulfilled') {
          const me = meRes.value.data;
          setUserStats({
            totalXP: me.xp_balance || 0,
            completedChallenges: 0, // Updated below from challenges
          });
        }

        // --- Challenges ---
        if (challengesRes.status === 'fulfilled' && Array.isArray(challengesRes.value.data)) {
          const mapped = challengesRes.value.data.map((c) => ({
            id: c.id,
            icon: ['bike', 'recycle', 'tram'][c.id % 3],
            name: c.title,
            xp: c.xp_reward || 0,
            difficulty: c.difficulty || 'Medium',
            deadline: c.deadline ? new Date(c.deadline).toLocaleDateString('en', { month: '2-digit', day: '2-digit' }) : 'N/A',
            status: c.status || 'Active',
          }));
          setChallenges(mapped);
          const completed = mapped.filter(c => c.status === 'Completed').length;
          setUserStats(prev => ({ ...prev, completedChallenges: completed }));
        } else {
          setChallenges(fallbackChallenges);
        }

        // --- Badges ---
        if (badgesRes.status === 'fulfilled' && Array.isArray(badgesRes.value.data)) {
          const me = meRes.status === 'fulfilled' ? meRes.value.data : null;
          const myXP = me?.xp_balance || initialUserStats.totalXP;
          const completedCount = challengesRes.status === 'fulfilled'
            ? challengesRes.value.data.filter(c => c.status === 'Completed').length
            : initialUserStats.completedChallenges;

          setBadges(badgesRes.value.data.map(b => {
            const iconMap = { 'Green Beginner': 'seedling', 'Carbon Saver': 'earth', 'Sustainability Champion': 'trophy', 'Team Player': 'star' };
            const icon = iconMap[b.name] || 'star';
            // Determine unlock rule from badge name
            const isXPBased = b.name.includes('Beginner') || b.name.includes('Saver');
            const threshold = b.xp_threshold || (isXPBased ? (b.name.includes('Beginner') ? 100 : 500) : (b.name.includes('Champion') ? 5 : 2));
            const current = isXPBased ? myXP : completedCount;
            const earned = current >= threshold;
            return {
              id: b.id,
              name: b.name,
              icon,
              unlockRule: { type: isXPBased ? 'xp' : 'challengesCompleted', threshold },
              threshold,
              current,
              earned,
              progressPercent: Math.min(100, Math.round((current / threshold) * 100)),
            };
          }));
        } else {
          setBadges(fallbackBadges);
        }

        // --- Rewards ---
        if (rewardsRes.status === 'fulfilled' && Array.isArray(rewardsRes.value.data)) {
          const iconList = ['bottle', 'tree', 'bag', 'gift', 'parking', 'calendar'];
          setRewards(rewardsRes.value.data.map((r, i) => ({
            id: r.id,
            icon: iconList[i % iconList.length],
            name: r.name,
            description: r.description || '',
            xpCost: r.points_required || 0,
            stock: r.stock_count,
          })));
        } else {
          setRewards(fallbackRewards);
        }

        // --- Leaderboard ---
        if (leaderboardRes.status === 'fulfilled' && Array.isArray(leaderboardRes.value.data)) {
          const meId = meRes.status === 'fulfilled' ? meRes.value.data.id : null;
          setLeaderboardIndividual(leaderboardRes.value.data.map(l => ({
            rank: l.rank,
            name: `${l.first_name} ${l.last_name}`,
            xp: l.xp_balance || 0,
            isCurrentUser: l.employee_id === meId,
          })));
        }

        // --- Redemptions ---
        if (redemptionsRes.status === 'fulfilled' && Array.isArray(redemptionsRes.value.data)) {
          setRedemptions(redemptionsRes.value.data.map(r => ({
            id: r.id,
            name: `Reward #${r.reward_id}`,
            date: new Date(r.redeemed_at).toLocaleDateString(),
          })));
        }
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

  // ---------- XP management ----------
  const awardXP = useCallback(
    (amount, reason) => {
      setUserStats(prev => {
        const next = prev.totalXP + amount;
        return { ...prev, totalXP: next };
      });
      pushToast(`+${amount} XP: ${reason}`, 'badge');
    },
    [pushToast]
  );

  // ---------- Challenge lifecycle ----------
  const activateChallenge = useCallback(
    async (id) => {
      try { await api.updateChallenge(id, { status: 'Active' }); } catch { /* local update */ }
      setChallenges(prev => prev.map(c => c.id === id ? { ...c, status: 'Active' } : c));
      pushToast('Challenge activated!', 'success');
    },
    [pushToast]
  );

  const submitForReview = useCallback(
    async (id) => {
      try { await api.updateChallenge(id, { status: 'Under Review' }); } catch {}
      setChallenges(prev => prev.map(c => c.id === id ? { ...c, status: 'Under Review' } : c));
      pushToast('Challenge submitted for review.', 'success');
    },
    [pushToast]
  );

  const approveAndComplete = useCallback(
    async (id) => {
      try { await api.updateChallenge(id, { status: 'Completed' }); } catch {}
      const ch = challenges.find(c => c.id === id);
      setChallenges(prev => prev.map(c => c.id === id ? { ...c, status: 'Completed' } : c));
      if (ch) {
        awardXP(ch.xp, `${ch.name} completed`);
        setUserStats(prev => ({ ...prev, completedChallenges: prev.completedChallenges + 1 }));
      }
    },
    [challenges, awardXP, pushToast]
  );

  const archiveChallenge = useCallback(
    async (id) => {
      try { await api.updateChallenge(id, { status: 'Archived' }); } catch {}
      setChallenges(prev => prev.map(c => c.id === id ? { ...c, status: 'Archived' } : c));
      pushToast('Challenge archived.', 'success');
    },
    [pushToast]
  );

  const joinChallenge = useCallback(
    async (id) => {
      try {
        await api.joinChallenge(id);
        pushToast('Joined challenge!', 'badge');
      } catch (err) {
        pushToast(err?.response?.data?.detail || 'Failed to join challenge', 'error');
      }
    },
    [pushToast]
  );

  // ---------- Rewards ----------
  const redeemReward = useCallback(
    async (reward) => {
      if (userStats.totalXP < reward.xpCost) {
        pushToast('Not enough XP to redeem this reward.', 'error');
        return;
      }
      try {
        await api.redeemReward(reward.id);
        setUserStats(prev => ({ ...prev, totalXP: prev.totalXP - reward.xpCost }));
        setRewards(prev => prev.map(r => r.id === reward.id ? { ...r, stock: (r.stock || 1) - 1 } : r));
        setRedemptions(prev => [...prev, { id: Date.now(), name: reward.name, date: new Date().toLocaleDateString() }]);
        pushToast(`Redeemed "${reward.name}"!`, 'badge');
      } catch (err) {
        pushToast(err?.response?.data?.detail || 'Failed to redeem reward', 'error');
      }
    },
    [userStats.totalXP, pushToast]
  );

  const value = useMemo(
    () => ({
      userStats,
      challenges, badges, rewards, redemptions,
      leaderboardIndividual, leaderboardDepartment,
      loading, toasts, dismissToast,
      awardXP, activateChallenge, submitForReview, approveAndComplete, archiveChallenge,
      joinChallenge, redeemReward,
    }),
    [
      userStats,
      challenges, badges, rewards, redemptions,
      leaderboardIndividual, leaderboardDepartment,
      loading, toasts, dismissToast,
      awardXP, activateChallenge, submitForReview, approveAndComplete, archiveChallenge,
      joinChallenge, redeemReward,
    ]
  );

  return <GamificationContext.Provider value={value}>{children}</GamificationContext.Provider>;
}
