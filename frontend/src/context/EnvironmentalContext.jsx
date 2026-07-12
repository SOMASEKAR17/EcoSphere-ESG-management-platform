import { createContext, useState, useMemo, useCallback, useEffect } from 'react';
import * as api from '../api/endpoints';
import {
  emissionFactors as fallbackFactors,
  environmentalGoals as fallbackGoals,
  carbonTransactions as fallbackTransactions,
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

export function EnvironmentalProvider({ children }) {
  const [emissionFactors, setEmissionFactors] = useState([]);
  const [carbonTransactions, setCarbonTransactions] = useState([]);
  const [environmentalGoals, setEnvironmentalGoals] = useState([]);
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

  // ---------- Fetch data from API on mount ----------
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [factorsRes, transactionsRes, goalsRes] = await Promise.allSettled([
          api.getEmissionFactors(),
          api.getCarbonTransactions(),
          api.getEnvironmentalGoals(),
        ]);

        setEmissionFactors(
          factorsRes.status === 'fulfilled'
            ? factorsRes.value.data.map((f) => ({
                id: f.id,
                category: f.factor_name || f.activity_type,
                factor: Number(f.factor_value),
                unit: f.unit,
                source: f.activity_type,
              }))
            : fallbackFactors
        );

        setCarbonTransactions(
          transactionsRes.status === 'fulfilled'
            ? transactionsRes.value.data.map((t) => ({
                id: t.id,
                source: t.source_type + (t.source_record_id ? ` #${t.source_record_id}` : ''),
                department: t.department_name || `Dept ${t.department_id}`,
                co2: formatKgAsCO2(Number(t.calculated_emission) * 1000),
                date: t.transaction_date?.slice(0, 10) || '',
                departmentId: t.department_id,
              }))
            : fallbackTransactions
        );

        setEnvironmentalGoals(
          goalsRes.status === 'fulfilled'
            ? goalsRes.value.data.map((g) => {
                const goal = {
                  id: g.id,
                  name: g.title,
                  department: g.department_name || `Dept ${g.department_id}`,
                  departmentId: g.department_id,
                  target: Number(g.target_value),
                  current: Number(g.current_value),
                  unit: g.target_metric || 't',
                  deadline: g.deadline,
                  status: g.status,
                };
                return { ...goal, progress: goalProgressPercent(goal) };
              })
            : fallbackGoals.map((g) => ({ ...g, progress: goalProgressPercent(g) }))
        );
      } catch {
        setEmissionFactors(fallbackFactors);
        setCarbonTransactions(fallbackTransactions);
        setEnvironmentalGoals(fallbackGoals.map((g) => ({ ...g, progress: goalProgressPercent(g) })));
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // ---------- Emission Factors (CRUD) ----------
  const addFactor = useCallback(
    async (factor) => {
      try {
        const { data } = await api.createEmissionFactor({
          activity_type: factor.source || 'Purchase',
          factor_name: factor.category,
          factor_value: Number(factor.factor),
          unit: factor.unit,
        });
        const mapped = {
          id: data.id,
          category: data.factor_name || data.activity_type,
          factor: Number(data.factor_value),
          unit: data.unit,
          source: data.activity_type,
        };
        setEmissionFactors((prev) => [...prev, mapped]);
        pushToast(`Emission factor "${factor.category}" added`, 'success');
      } catch {
        pushToast('Failed to add emission factor', 'error');
      }
    },
    [pushToast]
  );

  const updateFactor = useCallback(
    async (id, updates) => {
      try {
        await api.updateEmissionFactor(id, {
          factor_name: updates.category,
          factor_value: Number(updates.factor),
          unit: updates.unit,
        });
        setEmissionFactors((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
        pushToast('Emission factor updated', 'success');
      } catch {
        pushToast('Failed to update emission factor', 'error');
      }
    },
    [pushToast]
  );

  const deleteFactor = useCallback(
    async (id) => {
      try {
        await api.deleteEmissionFactor(id);
        setEmissionFactors((prev) => prev.filter((f) => f.id !== id));
        pushToast('Emission factor deleted', 'error');
      } catch {
        pushToast('Failed to delete emission factor', 'error');
      }
    },
    [pushToast]
  );

  // ---------- Carbon Transactions ----------
  const logTransaction = useCallback(
    async ({ factorId, amount, department, source }) => {
      const factor = emissionFactors.find((f) => f.id === Number(factorId));
      if (!factor) return null;

      const co2Kg = calculateEmissions(amount, factor.factor);

      try {
        await api.autoGenerateCarbonTransaction({
          department_id: 1, // TODO: resolve department name to ID
          source_type: factor.source || 'Purchase',
          emission_factor_id: factor.id,
          operational_quantity: amount,
        });
      } catch {
        // continue — log locally even if API fails
      }

      const entry = {
        id: Date.now(),
        source: source?.trim() || `Carbon Calculator — ${factor.category}`,
        department,
        co2: formatKgAsCO2(co2Kg),
        date: new Date().toISOString().slice(0, 10),
      };

      setCarbonTransactions((prev) => [entry, ...prev]);
      pushToast(`Logged ${entry.co2} CO2e for ${department}`, 'success');
      return entry;
    },
    [emissionFactors, pushToast]
  );

  const departmentTotals = useMemo(() => aggregateByDepartment(carbonTransactions), [carbonTransactions]);

  // ---------- Environmental Goals (CRUD) ----------
  const addGoal = useCallback(
    async (goal) => {
      try {
        const { data } = await api.createEnvironmentalGoal({
          title: goal.name,
          department_id: goal.departmentId || 1,
          target_metric: goal.unit || 't',
          target_value: Number(goal.target),
          current_value: Number(goal.current) || 0,
          deadline: goal.deadline,
        });
        const mapped = {
          id: data.id,
          name: data.title,
          department: goal.department,
          departmentId: data.department_id,
          target: Number(data.target_value),
          current: Number(data.current_value),
          unit: data.target_metric,
          deadline: data.deadline,
          status: data.status,
        };
        mapped.progress = goalProgressPercent(mapped);
        setEnvironmentalGoals((prev) => [...prev, mapped]);
        pushToast(`Goal "${goal.name}" created`, 'success');
      } catch {
        pushToast('Failed to create goal', 'error');
      }
    },
    [pushToast]
  );

  const updateGoal = useCallback(
    async (id, updates) => {
      try {
        await api.updateEnvironmentalGoal(id, {
          title: updates.name,
          target_value: Number(updates.target),
          current_value: Number(updates.current),
          deadline: updates.deadline,
        });
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
            if (nowComplete && !wasComplete) {
              pushToast(`Goal "${merged.name}" completed! 🎉`, 'badge');
            }
            return { ...merged, progress, status };
          })
        );
      } catch {
        pushToast('Failed to update goal', 'error');
      }
    },
    [pushToast]
  );

  const deleteGoal = useCallback(
    async (id) => {
      try {
        await api.deleteEnvironmentalGoal(id);
        setEnvironmentalGoals((prev) => prev.filter((g) => g.id !== id));
        pushToast('Goal deleted', 'error');
      } catch {
        pushToast('Failed to delete goal', 'error');
      }
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
      loading,
    }),
    [
      emissionFactors, addFactor, updateFactor, deleteFactor,
      carbonTransactions, logTransaction, departmentTotals,
      environmentalGoals, addGoal, updateGoal, deleteGoal,
      toasts, dismissToast, loading,
    ]
  );

  return <EnvironmentalContext.Provider value={value}>{children}</EnvironmentalContext.Provider>;
}
