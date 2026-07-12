const map = {
  active: 'success',
  'on track': 'teal',
  completed: 'teal',
  open: 'critical',
  resolved: 'success',
  pending: 'warning',
  approved: 'success',
  rejected: 'critical',
  'under review': 'plum',
  draft: 'neutral',
  archived: 'neutral',
  high: 'critical',
  medium: 'warning',
  low: 'success',
};

export default function StatusPill({ status }) {
  const key = status?.toLowerCase();
  const variant = map[key] || 'neutral';
  return <span className={`pill pill--${variant}`}>{status}</span>;
}
