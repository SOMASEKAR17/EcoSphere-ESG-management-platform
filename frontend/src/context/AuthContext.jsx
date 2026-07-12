import { createContext, useState, useCallback, useMemo, useEffect } from 'react';
import * as api from '../api/endpoints';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('ecosphere_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('ecosphere_token'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isAuthenticated = Boolean(token && user);

  const persistAuth = useCallback((tokenValue, userData) => {
    localStorage.setItem('ecosphere_token', tokenValue);
    localStorage.setItem('ecosphere_user', JSON.stringify(userData));
    setToken(tokenValue);
    setUser(userData);
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem('ecosphere_token');
    localStorage.removeItem('ecosphere_user');
    setToken(null);
    setUser(null);
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.login({ email, password });
      persistAuth(data.token, data.employee);
      return data;
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Login failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [persistAuth]);

  const register = useCallback(async (firstName, lastName, email, password) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.register({
        first_name: firstName,
        last_name: lastName,
        email,
        password,
      });
      persistAuth(data.token, data.employee);
      return data;
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Registration failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [persistAuth]);

  const devLogin = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.devLogin();
      persistAuth(data.token, data.employee);
      return data;
    } catch (err) {
      console.warn('[AuthContext] Dev login not available:', err?.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [persistAuth]);

  const logout = useCallback(() => {
    api.logout().catch(() => {}); // best-effort server-side
    clearAuth();
  }, [clearAuth]);

  // Validate token on mount by calling /auth/me
  useEffect(() => {
    if (token && !user) {
      api.getMe()
        .then(({ data }) => {
          setUser(data);
          localStorage.setItem('ecosphere_user', JSON.stringify(data));
        })
        .catch(() => {
          clearAuth();
        });
    }
  }, [token, user, clearAuth]);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated,
      loading,
      error,
      login,
      register,
      devLogin,
      logout,
      setError,
    }),
    [user, token, isAuthenticated, loading, error, login, register, devLogin, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
