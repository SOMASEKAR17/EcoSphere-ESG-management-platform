export default function ProgressBar({ percent, color }) {
  const fillStyle = {
    width: `${Math.min(percent, 100)}%`,
  };
  if (color) {
    fillStyle.background = `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 70%, #fff))`;
  }
  return (
    <span>
      <span className="progress-bar">
        <span className="progress-bar__fill" style={fillStyle} />
      </span>
      <span className="mono text-secondary" style={{ fontSize: 12 }}>{percent}%</span>
    </span>
  );
}
