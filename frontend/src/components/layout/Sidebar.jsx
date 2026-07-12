import { useState, useRef, useLayoutEffect } from 'react';
import { NavLink, useLocation, useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronsLeft, ChevronsRight } from 'lucide-react';
import gsap from 'gsap';
import { navConfig } from '../../data/navConfig';
import './sidebar.css';

export default function Sidebar() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);
  const [openKey, setOpenKey] = useState(
    navConfig.find((n) => n.path !== '/' && location.pathname.startsWith(n.path))?.key ?? null
  );
  const asideRef = useRef(null);

  useLayoutEffect(() => {
    gsap.fromTo(
      asideRef.current,
      { x: -24, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }
    );
  }, []);

  const activeTab = searchParams.get('tab');

  return (
    <aside ref={asideRef} className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar__brand">
        <div className="sidebar__logo">
          <img src="/icon.png" alt="EcoSphere logo" />
        </div>
        {!collapsed && (
          <div>
            <div className="sidebar__brand-name">EcoSphere</div>
            <div className="sidebar__brand-tag">ESG &amp; Impact Suite</div>
          </div>
        )}
        <button
          className="sidebar__collapse-btn"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
      </div>

      <nav className="sidebar__nav">
        {navConfig.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
          const isOpen = openKey === item.key;

          return (
            <div key={item.key} className="sidebar__group">
              <NavLink
                to={item.path}
                className={`sidebar__item ${isActive ? 'sidebar__item--active' : ''}`}
                style={{ '--accent': item.color }}
                onClick={() => item.children.length && setOpenKey(isOpen ? null : item.key)}
              >
                <Icon size={17} strokeWidth={2} className="sidebar__icon" />
                {!collapsed && <span className="sidebar__label">{item.label}</span>}
                {!collapsed && item.children.length > 0 && (
                  <ChevronDown
                    size={14}
                    className="sidebar__chevron"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  />
                )}
              </NavLink>

              {!collapsed && item.children.length > 0 && isOpen && (
                <div className="sidebar__children">
                  {item.children.map((child) => {
                    const isChildActive = isActive && activeTab === child;
                    return (
                      <NavLink
                        key={child}
                        to={`${item.path}?tab=${encodeURIComponent(child)}`}
                        className={`sidebar__child ${isChildActive ? 'sidebar__child--active' : ''}`}
                        style={{ '--accent': item.color }}
                      >
                        {child}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="sidebar__footer">
          <div className="sidebar__footer-avatar">AM</div>
          <div>
            <div className="sidebar__footer-name">Anjali Mehta</div>
            <div className="sidebar__footer-role">ESG Administrator</div>
          </div>
        </div>
      )}
    </aside>
  );
}
