import { FaCircleCheck, FaTrophy, FaCircleExclamation } from 'react-icons/fa6';
import './common.css';

const VARIANT_ICON = {
  success: FaCircleCheck,
  badge: FaTrophy,
  error: FaCircleExclamation,
};

const VARIANT_COLOR = {
  success: 'var(--success)',
  badge: 'var(--gamify-gold)',
  error: 'var(--critical)',
};

export default function ToastStack({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div className="toast-stack">
      {toasts.map((t) => {
        const Icon = VARIANT_ICON[t.variant] || FaCircleCheck;
        return (
          <div key={t.id} className={`toast toast--${t.variant}`}>
            <Icon className="toast__icon" size={16} color={VARIANT_COLOR[t.variant]} />
            <span>{t.message}</span>
            <button className="toast__close" onClick={() => onDismiss(t.id)} aria-label="Dismiss">
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
