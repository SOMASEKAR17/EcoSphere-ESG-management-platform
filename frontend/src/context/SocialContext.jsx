import { createContext, useState, useCallback, useMemo, useEffect } from 'react';
import * as api from '../api/endpoints';
import {
  csrActivities as fallbackCsr,
  employeeParticipation as fallbackParticipation,
  trainings as fallbackTrainings,
} from '../data/mockData';
import useGamification from '../hooks/useGamification';

export const SocialContext = createContext(null);

const nextToastId = (() => {
  let id = 0;
  return () => ++id;
})();

const CURRENT_USER = 'You';
const DEFAULT_JOIN_POINTS = 25;

export function SocialProvider({ children }) {
  const { awardXP } = useGamification();

  const [csrActivities, setCsrActivities] = useState([]);
  const [employeeParticipation, setEmployeeParticipation] = useState([]);
  const [trainings, setTrainings] = useState(fallbackTrainings);
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
        const [csrRes, participationRes] = await Promise.allSettled([
          api.getCSRActivities(),
          api.getCSRParticipation(),
        ]);

        setCsrActivities(
          csrRes.status === 'fulfilled'
            ? csrRes.value.data.map((a) => ({
                id: a.id,
                icon: 'tree',
                name: a.title || a.name,
                joined: a.participant_count || 0,
                evidenceRequired: a.evidence_required ?? true,
                status: a.status || 'Open',
              }))
            : fallbackCsr
        );

        setEmployeeParticipation(
          participationRes.status === 'fulfilled'
            ? participationRes.value.data.map((p) => ({
                id: p.id,
                employee: p.employee_name || `Employee ${p.employee_id}`,
                activity: p.activity_name || `Activity ${p.activity_id}`,
                proof: p.proof_file_path || '—',
                points: p.points_earned || DEFAULT_JOIN_POINTS,
                approval: p.approval_status || 'Pending',
                rejectReason: null,
              }))
            : fallbackParticipation
        );
      } catch {
        setCsrActivities(fallbackCsr);
        setEmployeeParticipation(fallbackParticipation);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // ---------- CSR Activities ----------
  const addActivity = useCallback(
    async (activity) => {
      try {
        const { data } = await api.createCSRActivity({
          title: activity.name,
          description: activity.name,
          evidence_required: activity.evidenceRequired ?? true,
          points_awarded: DEFAULT_JOIN_POINTS,
          activity_date: new Date().toISOString().slice(0, 10),
        });
        setCsrActivities((prev) => [
          ...prev,
          {
            id: data.id,
            icon: activity.icon || 'tree',
            name: data.title,
            joined: 0,
            evidenceRequired: data.evidence_required,
            status: data.status || 'Open',
          },
        ]);
        pushToast(`CSR activity "${activity.name}" created`, 'success');
      } catch {
        pushToast('Failed to create CSR activity', 'error');
      }
    },
    [pushToast]
  );

  const joinActivity = useCallback(
    async (id, proofFile = null) => {
      const activity = csrActivities.find((a) => a.id === id);
      if (!activity) return;

      try {
        await api.participateInCSR(id, proofFile);
        setCsrActivities((prev) => prev.map((a) => (a.id === id ? { ...a, joined: a.joined + 1 } : a)));
        setEmployeeParticipation((prev) => [
          ...prev,
          {
            id: Date.now(),
            employee: CURRENT_USER,
            activity: activity.name,
            proof: proofFile ? proofFile.name : '—',
            points: DEFAULT_JOIN_POINTS,
            approval: 'Pending',
            rejectReason: null,
          },
        ]);
        pushToast(`You joined "${activity.name}" — pending approval`, 'success');
      } catch (err) {
        pushToast(err?.response?.data?.detail || err?.message || 'Failed to join activity', 'error');
      }
    },
    [csrActivities, pushToast]
  );

  // ---------- Employee Participation ----------
  const approveParticipation = useCallback(
    async (id) => {
      const row = employeeParticipation.find((e) => e.id === id);
      if (!row) return;

      try {
        await api.approveParticipation(id);
        setEmployeeParticipation((prev) =>
          prev.map((e) => (e.id === id ? { ...e, approval: 'Approved', rejectReason: null } : e))
        );
        awardXP(row.points, `${row.activity} approved`);
      } catch {
        // Fall back to local state update
        setEmployeeParticipation((prev) =>
          prev.map((e) => (e.id === id ? { ...e, approval: 'Approved', rejectReason: null } : e))
        );
        awardXP(row.points, `${row.activity} approved`);
      }
    },
    [employeeParticipation, awardXP]
  );

  const rejectParticipation = useCallback(
    async (id, reason) => {
      const finalReason = reason?.trim() || 'Insufficient evidence provided';
      try {
        await api.rejectParticipation(id, finalReason);
      } catch {
        // continue with local update
      }
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
      loading,
      addActivity,
      joinActivity,
      approveParticipation,
      rejectParticipation,
      completeTraining,
      dismissToast,
    }),
    [
      csrActivities, employeeParticipation, trainings, toasts, loading,
      addActivity, joinActivity, approveParticipation, rejectParticipation,
      completeTraining, dismissToast,
    ]
  );

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}
