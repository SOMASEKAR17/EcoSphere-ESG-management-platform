import { useLayoutEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { navConfig } from '../../data/navConfig';
import './topbar.css';

const pageMeta = {
  '/': { title: 'Dashboard: Executive Overview', module: 'Dashboard' },
  '/environmental': { title: 'Environmental: Emission Tracking & Goals', module: 'Environmental' },
  '/social': { title: 'Social: CSR & Employee Engagement', module: 'Social' },
  '/governance': { title: 'Governance: Policies, Audits & Compliance', module: 'Governance' },
  '/gamification': { title: 'Gamification: Challenges, Badges & Leaderboard', module: 'Gamification' },
  '/reports': { title: 'Reports: Analytics & Custom Report Builder', module: 'Reports' },
  '/settings': { title: 'Settings: Configuration & Administration', module: 'Settings' },
};

export default function Topbar() {
  const location = useLocation();
  const meta = pageMeta[location.pathname] || pageMeta['/'];
  const titleRef = useRef(null);

  useLayoutEffect(() => {
    gsap.fromTo(
      titleRef.current,
      { opacity: 0, y: -6 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
    );
  }, [meta.title]);

  return (
    <header className="topbar">
      <h1 ref={titleRef} className="topbar__title">
        {meta.title}
      </h1>

      {/* <div className="topbar__breadcrumb">
        <span className="topbar__dot" style={{ background: 'var(--critical)' }} />
        <span className="topbar__dot" style={{ background: 'var(--warning)' }} />
        <span className="topbar__dot" style={{ background: 'var(--env-green)' }} />
        <span className="topbar__breadcrumb-text">EcoSphere: {meta.module}</span>
      </div> */}

      <nav className="topbar__tabs">
        {navConfig.map((item) => {
          const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.key}
              to={item.path}
              className={`topbar__tab ${isActive ? 'topbar__tab--active' : ''}`}
              style={{ '--accent': item.color }}
            >
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </header>
  );
}
