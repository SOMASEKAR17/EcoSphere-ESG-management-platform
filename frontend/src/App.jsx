import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import useLenis from './hooks/useLenis';
import Layout from './components/layout/Layout';
import LoginPage from './pages/Login';
import AuthSuccess from './pages/AuthSuccess';
import Dashboard from './pages/Dashboard';
import Environmental from './pages/Environmental';
import Social from './pages/Social';
import Governance from './pages/Governance';
import Gamification from './pages/Gamification';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { GamificationProvider } from './context/GamificationContext';
import { EnvironmentalProvider } from './context/EnvironmentalContext';
import { SocialProvider } from './context/SocialContext';
import { GovernanceProvider } from './context/GovernanceContext';
import useAuth from './hooks/useAuth';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

function AppRoutes() {
  useLenis();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/success" element={<AuthSuccess />} />

      <Route
        element={
          <ProtectedRoute>
            <SettingsProvider>
              <EnvironmentalProvider>
                <GamificationProvider>
                  <SocialProvider>
                    <GovernanceProvider>
                      <Layout />
                    </GovernanceProvider>
                  </SocialProvider>
                </GamificationProvider>
              </EnvironmentalProvider>
            </SettingsProvider>
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/environmental" element={<Environmental />} />
        <Route path="/social" element={<Social />} />
        <Route path="/governance" element={<Governance />} />
        <Route path="/gamification" element={<Gamification />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
