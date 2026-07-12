import { Routes, Route } from 'react-router-dom';
import useLenis from './hooks/useLenis';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Environmental from './pages/Environmental';
import Social from './pages/Social';
import Governance from './pages/Governance';
import Gamification from './pages/Gamification';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import { SettingsProvider } from './context/SettingsContext';
import { GamificationProvider } from './context/GamificationContext';
import { EnvironmentalProvider } from './context/EnvironmentalContext';
import { SocialProvider } from './context/SocialContext';
import { GovernanceProvider } from './context/GovernanceContext';

export default function App() {
  useLenis();

  return (
    <SettingsProvider>
      <EnvironmentalProvider>
        <GamificationProvider>
          <SocialProvider>
            <GovernanceProvider>
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/environmental" element={<Environmental />} />
                  <Route path="/social" element={<Social />} />
                  <Route path="/governance" element={<Governance />} />
                  <Route path="/gamification" element={<Gamification />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Routes>
            </GovernanceProvider>
          </SocialProvider>
        </GamificationProvider>
      </EnvironmentalProvider>
    </SettingsProvider>
  );
}
