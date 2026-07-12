export default function Toggle({ label, checked, onChange }) {
  return (
    <div className="toggle">
      <button
        className={`toggle__track ${checked ? 'toggle__track--on' : ''}`}
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        aria-label={label}
      >
        <span className="toggle__thumb" />
      </button>
      <span className="toggle__label">{label}</span>
    </div>
  );
}
