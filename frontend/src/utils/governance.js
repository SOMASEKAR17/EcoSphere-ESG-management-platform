/**
 * Pure Governance helpers — no React, no state. Kept separate from the
 * context so they're trivial to unit test and reuse.
 */

function csvEscape(value) {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Serializes audits to a CSV string (header + one row per audit). */
export function auditsToCSV(audits) {
  const header = ['Title', 'Department', 'Auditor', 'Date', 'Findings', 'Status'];
  const rows = audits.map((a) => [a.title, a.department, a.auditor, a.date, a.findings, a.status]);
  return [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
}

/** Serializes audits to a pretty-printed JSON string. */
export function auditsToJSON(audits) {
  return JSON.stringify(audits, null, 2);
}

/**
 * Bumps a semantic-ish "vX.Y" version string to the next minor version.
 * Falls back to "v1.0" if the current version doesn't parse.
 */
export function bumpVersion(version) {
  const match = String(version || '').match(/^v?(\d+)\.(\d+)$/i);
  if (!match) return 'v1.0';
  const major = Number(match[1]);
  const minor = Number(match[2]) + 1;
  return `v${major}.${minor}`;
}

/** Derives live acknowledged/total counts from a department's employee list. */
export function ackCounts(employees) {
  const total = employees.length;
  const acknowledged = employees.filter((e) => e.acknowledged).length;
  return { acknowledged, total };
}

/** The lifecycle an audit moves through, in order. */
export const AUDIT_STAGES = ['Scheduled', 'In Progress', 'Completed', 'Under Review'];

/** Returns the next stage for an audit's status, or null if already terminal. */
export function nextAuditStage(status) {
  const idx = AUDIT_STAGES.indexOf(status);
  if (idx === -1 || idx === AUDIT_STAGES.length - 1) return null;
  return AUDIT_STAGES[idx + 1];
}
