/**
 * Pure gamification helpers — no React, no state. Given a user's stats and
 * the badge catalog, work out which badges are earned vs. locked (and how
 * close the user is to unlocking each locked one).
 */

/**
 * @param {{ totalXP: number, completedChallenges: number }} userStats
 * @param {Array<{ id: number, unlockRule: { type: 'xp'|'challengesCompleted', threshold: number } }>} badges
 * @returns {Array} badges annotated with { earned, current, threshold, progressPercent }
 */
export function evaluateBadges(userStats, badges) {
  return badges.map((badge) => {
    const { type, threshold } = badge.unlockRule;
    const current = type === 'xp' ? userStats.totalXP : userStats.completedChallenges;
    const earned = current >= threshold;
    const progressPercent = Math.max(0, Math.min(100, Math.round((current / threshold) * 100)));

    return {
      ...badge,
      earned,
      current,
      threshold,
      progressPercent,
    };
  });
}

/**
 * Returns the badges that are newly earned in `nextBadges` but were not
 * earned yet in `prevBadges` (matched by id). Used to trigger unlock
 * celebrations only for badges that just crossed their threshold.
 */
export function getNewlyEarnedBadges(prevBadges, nextBadges) {
  const prevEarnedIds = new Set(prevBadges.filter((b) => b.earned).map((b) => b.id));
  return nextBadges.filter((b) => b.earned && !prevEarnedIds.has(b.id));
}
