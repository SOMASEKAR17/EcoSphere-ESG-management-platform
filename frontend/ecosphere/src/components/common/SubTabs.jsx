import { useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import './common.css';

export default function SubTabs({ tabs, active, onChange, accent = 'var(--teal)' }) {
  const wrapRef = useRef(null);

  useLayoutEffect(() => {
    gsap.fromTo(
      wrapRef.current.children,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', stagger: 0.04 }
    );
  }, []);

  return (
    <div ref={wrapRef} className="subtabs" style={{ '--accent': accent }}>
      {tabs.map((tab) => (
        <button
          key={tab}
          className={`subtabs__item ${tab === active ? 'subtabs__item--active' : ''}`}
          onClick={() => onChange(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
