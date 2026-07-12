import './common.css';

export default function KpiCard({ label, value, suffix = '/ 100', accent = 'var(--teal)' }) {
  return (
    <div className="kpi-card" style={{ '--accent': accent }}>
      <div className="kpi-card__label">{label}</div>
      <div className="kpi-card__value">
        {value}
        <small>{suffix}</small>
      </div>
    </div>
  );
}
