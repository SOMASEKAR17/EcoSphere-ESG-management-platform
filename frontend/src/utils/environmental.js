/**
 * Pure environmental/carbon helpers — no React, no state. Kept separate from
 * the context so the math is trivial to unit test and reuse (e.g. from a
 * future backend-backed version of the same screens).
 */

/**
 * Core carbon calculator: CO2e (kg) = activity amount × emission factor.
 * Emission factors in mockData are expressed as "kg CO2e / <unit>" so the
 * result of this function is always in kilograms.
 *
 * @param {number|string} amount - activity amount (e.g. liters, kWh, tkm, kg)
 * @param {number|string} factor - emission factor value
 * @returns {number} CO2e in kilograms (0 if either input isn't a valid number)
 */
export function calculateEmissions(amount, factor) {
  const numAmount = Number(amount);
  const numFactor = Number(factor);
  if (!Number.isFinite(numAmount) || !Number.isFinite(numFactor)) return 0;
  return numAmount * numFactor;
}

/**
 * Parses a display CO2 string like "3.2 t" or "480 kg" (or a raw number,
 * assumed to already be kilograms) into a plain kilogram figure so entries
 * logged from different places can be aggregated consistently.
 */
export function parseCO2ToKg(co2) {
  if (typeof co2 === 'number') return co2;
  if (!co2) return 0;
  const match = String(co2).trim().match(/^([\d.]+)\s*(t|kg)?$/i);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  const unit = (match[2] || 'kg').toLowerCase();
  return unit === 't' ? value * 1000 : value;
}

/** Formats a kilogram figure back into the "X t" / "X kg" display convention used across the app. */
export function formatKgAsCO2(kg) {
  if (!Number.isFinite(kg)) return '0 kg';
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`;
  return `${kg.toFixed(1)} kg`;
}

/**
 * Aggregates a list of carbon transactions into per-department totals.
 * @returns {Array<{ department: string, totalKg: number, totalDisplay: string }>} sorted descending by totalKg
 */
export function aggregateByDepartment(transactions) {
  const totals = new Map();
  transactions.forEach((t) => {
    const kg = parseCO2ToKg(t.co2);
    totals.set(t.department, (totals.get(t.department) || 0) + kg);
  });
  return Array.from(totals.entries())
    .map(([department, totalKg]) => ({
      department,
      totalKg,
      totalDisplay: formatKgAsCO2(totalKg),
    }))
    .sort((a, b) => b.totalKg - a.totalKg);
}

/** Case-insensitive filter of goals by name or department. */
export function filterGoals(goals, query) {
  const q = query.trim().toLowerCase();
  if (!q) return goals;
  return goals.filter(
    (g) => g.name.toLowerCase().includes(q) || g.department.toLowerCase().includes(q)
  );
}

/** Progress percent (0-100, integer) for a goal's current vs. target. */
export function goalProgressPercent(goal) {
  const target = Number(goal.target);
  const current = Number(goal.current);
  if (!target) return 0;
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
}

/** Whether a goal's current value has reached (or passed) its target. */
export function isGoalComplete(goal) {
  return Number(goal.current) >= Number(goal.target);
}

function csvEscape(value) {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Serializes goals to a CSV string (header + one row per goal). */
export function goalsToCSV(goals) {
  const header = ['Name', 'Department', 'Target', 'Current', 'Unit', 'Progress %', 'Deadline', 'Status'];
  const rows = goals.map((g) => [g.name, g.department, g.target, g.current, g.unit, g.progress, g.deadline, g.status]);
  return [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
}

/** Serializes goals to a pretty-printed JSON string. */
export function goalsToJSON(goals) {
  return JSON.stringify(goals, null, 2);
}

/** Triggers a client-side download of a text blob (CSV/JSON exports, etc). No backend involved. */
export function downloadTextFile(filename, content, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
