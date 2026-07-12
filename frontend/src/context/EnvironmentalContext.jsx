import { createContext, useState, useMemo, useCallback } from 'react';
import {
  emissionFactors as initialEmissionFactors,
  environmentalGoals as initialGoals,
  carbonTransactions as initialTransactions,
} from '../data/mockData';
import {
  calculateEmissions,
  formatKgAsCO2,
  aggregateByDepartment,
  goalProgressPercent,
  isGoalComplete,
} from '../utils/environmental';

export const EnvironmentalContext = createContext(null);

const nextToastId = (() => {
  let id = 0;
  return () => ++id;
})();

const nextArrayId = (arr) => arr.reduce((max, item) => Math.max(max, item.id), 0) + 1;

export function EnvironmentalProvider({ children }) {
  const [emissionFactors, setEmissionFactors] = useState(initialEmissionFactors);
  const [carbonTransactions, setCarbonTransactions] = useState(initialTransactions);
  const [environmentalGoals, setEnvironmentalGoals] = useState(
    initialGoals.map((g) => ({ ...g, progress: goalProgressPercent(g) }))
  );
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

  // ---------- Emission Factors (CRUD) ----------
  const addFactor = useCallback(
    (factor) => {
      setEmissionFactors((prev) => [...prev, { ...factor, id: nextArrayId(prev) }]);
      pushToast(`Emission factor "${factor.category}" added`, 'success');
    },
    [pushToast]
  );

  const updateFactor = useCallback(
    (id, updates) => {
      setEmissionFactors((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
      pushToast('Emission factor updated', 'success');
    },
    [pushToast]
  );

  const deleteFactor = useCallback(
    (id) => {
      setEmissionFactors((prev) => prev.filter((f) => f.id !== id));
      pushToast('Emission factor deleted', 'error');
    },
    [pushToast]
  );

  // ---------- Carbon Calculator / Transactions ----------
  const logTransaction = useCallback(
    ({ factorId, amount, department, source }) => {
      const factor = emissionFactors.find((f) => f.id === Number(factorId));
      if (!factor) return null;

      const co2Kg = calculateEmissions(amount, factor.factor);
      const entry = {
        id: nextArrayId(carbonTransactions),
        source: source?.trim() || `Carbon Calculator — ${factor.category}`,
        department,
        co2: formatKgAsCO2(co2Kg),
        date: new Date().toISOString().slice(0, 10),
      };

      setCarbonTransactions((prev) => [entry, ...prev]);
      pushToast(`Logged ${entry.co2} CO2e for ${department}`, 'success');
      return entry;
    },
    [emissionFactors, carbonTransactions, pushToast]
  );

  const departmentTotals = useMemo(() => aggregateByDepartment(carbonTransactions), [carbonTransactions]);

  // ---------- Sustainability Goals (CRUD) ----------
  const addGoal = useCallback(
    (goal) => {
      setEnvironmentalGoals((prev) => {
        const draft = {
          ...goal,
          id: nextArrayId(prev),
          target: Number(goal.target),
          current: Number(goal.current) || 0,
        };
        const progress = goalProgressPercent(draft);
        const status = isGoalComplete(draft) ? 'Completed' : goal.status || 'Active';
        return [...prev, { ...draft, progress, status }];
      });
      pushToast(`Goal "${goal.name}" created`, 'success');
    },
    [pushToast]
  );

  const updateGoal = useCallback(
    (id, updates) => {
      setEnvironmentalGoals((prev) =>
        prev.map((g) => {
          if (g.id !== id) return g;

          const merged = {
            ...g,
            ...updates,
            target: Number(updates.target ?? g.target),
            current: Number(updates.current ?? g.current),
          };
          const progress = goalProgressPercent(merged);
          const wasComplete = g.status === 'Completed';
          const nowComplete = isGoalComplete(merged);
          const status = nowComplete ? 'Completed' : merged.status === 'Completed' ? 'Active' : merged.status;
          const finalGoal = { ...merged, progress, status };

          if (nowComplete && !wasComplete) {
            pushToast(`Goal "${finalGoal.name}" completed! 🎉`, 'badge');
          }
          return finalGoal;
        })
      );
    },
    [pushToast]
  );

  const deleteGoal = useCallback(
    (id) => {
      setEnvironmentalGoals((prev) => prev.filter((g) => g.id !== id));
      pushToast('Goal deleted', 'error');
    },
    [pushToast]
  );

  const value = useMemo(
    () => ({
      emissionFactors,
      addFactor,
      updateFactor,
      deleteFactor,
      carbonTransactions,
      logTransaction,
      departmentTotals,
      environmentalGoals,
      addGoal,
      updateGoal,
      deleteGoal,
      toasts,
      dismissToast,
    }),
    [
      emissionFactors,
      addFactor,
      updateFactor,
      deleteFactor,
      carbonTransactions,
      logTransaction,
      departmentTotals,
      environmentalGoals,
      addGoal,
      updateGoal,
      deleteGoal,
      toasts,
      dismissToast,
    ]
  );

  return <EnvironmentalContext.Provider value={value}>{children}</EnvironmentalContext.Provider>;
}
