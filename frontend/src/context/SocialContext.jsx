import { createContext, useState, useCallback, useMemo } from 'react';
import {
  csrActivities as initialCsrActivities,
  employeeParticipation as initialEmployeeParticipation,
  trainings as initialTrainings,
} from '../data/mockData';
import useGamification from '../hooks/useGamification';

export const SocialContext = createContext(null);

const nextToastId = (() => {
  let id = 0;
  return () => ++id;
})();

const nextArrayId = (arr) => arr.reduce((max, item) => Math.max(max, item.id), 0) + 1;

// The "current user" for the demo — mirrors the same idea used by the
// Gamification leaderboard's "You" row.
const CURRENT_USER = 'You';
const DEFAULT_JOIN_POINTS = 25;

export function SocialProvider({ children }) {
  const { awardXP } = useGamification();

  const [csrActivities, setCsrActivities] = useState(initialCsrActivities);
  const [employeeParticipation, setEmployeeParticipation] = useState(initialEmployeeParticipation);
  const [trainings, setTrainings] = useState(initialTrainings);
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

  // ---------- CSR Activities ----------
  const addActivity = useCallback(
    (activity) => {
      setCsrActivities((prev) => [
        ...prev,
        { ...activity, id: nextArrayId(prev), joined: 0, status: 'Open' },
      ]);
      pushToast(`CSR activity "${activity.name}" created`, 'success');
    },
    [pushToast]
  );

  const joinActivity = useCallback(
    (id) => {
      const activity = csrActivities.find((a) => a.id === id);
      if (!activity) return;

      setCsrActivities((prev) => prev.map((a) => (a.id === id ? { ...a, joined: a.joined + 1 } : a)));
      setEmployeeParticipation((prev) => [
        ...prev,
        {
          id: nextArrayId(prev),
          employee: CURRENT_USER,
          activity: activity.name,
          proof: activity.evidenceRequired ? 'pending-upload' : '—',
          points: DEFAULT_JOIN_POINTS,
          approval: 'Pending',
          rejectReason: null,
        },
      ]);
      pushToast(`You joined "${activity.name}" — pending approval`, 'success');
    },
    [csrActivities, pushToast]
  );

  // ---------- Employee Participation (approval queue) ----------
  const approveParticipation = useCallback(
    (id) => {
      const row = employeeParticipation.find((e) => e.id === id);
      if (!row) return;

      setEmployeeParticipation((prev) =>
        prev.map((e) => (e.id === id ? { ...e, approval: 'Approved', rejectReason: null } : e))
      );
      awardXP(row.points, `${row.activity} approved`);
    },
    [employeeParticipation, awardXP]
  );

  const rejectParticipation = useCallback(
    (id, reason) => {
      const finalReason = reason?.trim() || 'Insufficient evidence provided';
      setEmployeeParticipation((prev) =>
        prev.map((e) => (e.id === id ? { ...e, approval: 'Rejected', rejectReason: finalReason } : e))
      );
      pushToast(`Rejected: ${finalReason}`, 'error');
    },
    [pushToast]
  );

  // ---------- Training Completion ----------
  const completeTraining = useCallback(
    (id) => {
      const training = trainings.find((t) => t.id === id);
      if (!training) return;

      setTrainings((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: 'Completed', completion: 100 } : t))
      );
      awardXP(20, `${training.course} completed`);
    },
    [trainings, awardXP]
  );

  const value = useMemo(
    () => ({
      csrActivities,
      employeeParticipation,
      trainings,
      toasts,
      addActivity,
      joinActivity,
      approveParticipation,
      rejectParticipation,
      completeTraining,
      dismissToast,
    }),
    [
      csrActivities,
      employeeParticipation,
      trainings,
      toasts,
      addActivity,
      joinActivity,
      approveParticipation,
      rejectParticipation,
      completeTraining,
      dismissToast,
    ]
  );

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}
