export default function ProgressBar({ percent }) {
  return (
    <span>
      <span className="progress-bar">
        <span className="progress-bar__fill" style={{ width: `${Math.min(percent, 100)}%` }} />
      </span>
      <span className="mono text-secondary" style={{ fontSize: 12 }}>{percent}%</span>
    </span>
  );
}
