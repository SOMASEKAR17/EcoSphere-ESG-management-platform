import { Outlet, useLocation } from 'react-router-dom';
import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import './layout.css';

export default function Layout() {
  const location = useLocation();
  const mainRef = useRef(null);

  useLayoutEffect(() => {
    gsap.fromTo(
      mainRef.current,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
    );
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-shell__content">
        <Topbar />
        <main ref={mainRef} className="app-shell__main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
