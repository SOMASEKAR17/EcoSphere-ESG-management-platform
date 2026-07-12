import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Leaf, Mail, Lock, User, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import useAuth from '../hooks/useAuth';
import './Login.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register, devLogin, loading, error, setError } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });

  const returnTo = searchParams.get('returnTo') || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      if (isRegister) {
        if (!form.firstName.trim() || !form.lastName.trim()) {
          setError('Please enter your full name.');
          return;
        }
        await register(form.firstName, form.lastName, form.email, form.password);
      } else {
        await login(form.email, form.password);
      }
      navigate(returnTo, { replace: true });
    } catch {
      // Error is handled by AuthContext
    }
  };

  const handleDevLogin = async () => {
    setError(null);
    const result = await devLogin();
    if (result) {
      navigate(returnTo, { replace: true });
    } else {
      setError('Dev login failed. Make sure the database is seeded.');
    }
  };

  const handleGoogleLogin = () => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
    window.location.href = `${apiBase}/auth/login/google`;
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="login-page">
      {/* Animated background */}
      <div className="login-bg">
        <div className="login-bg__orb login-bg__orb--1" />
        <div className="login-bg__orb login-bg__orb--2" />
        <div className="login-bg__orb login-bg__orb--3" />
      </div>

      <div className="login-container">
        {/* Left panel — branding */}
        <div className="login-hero">
          <div className="login-hero__content">
            <div className="login-hero__logo">
              <div className="login-hero__icon">
                <Leaf size={28} />
              </div>
              <span className="login-hero__brand">EcoSphere</span>
            </div>
            <h1 className="login-hero__title">
              ESG Management<br />
              <span className="login-hero__highlight">Reimagined</span>
            </h1>
            <p className="login-hero__desc">
              Track environmental impact, manage social responsibility, and ensure governance compliance — all in one beautiful platform.
            </p>

            <div className="login-hero__features">
              <div className="login-hero__feature">
                <Sparkles size={16} />
                <span>Real-time ESG scoring</span>
              </div>
              <div className="login-hero__feature">
                <Sparkles size={16} />
                <span>Gamified sustainability</span>
              </div>
              <div className="login-hero__feature">
                <Sparkles size={16} />
                <span>Compliance tracking</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel — form */}
        <div className="login-form-panel">
          <div className="login-form-wrap">
            <div className="login-form__header">
              <h2>{isRegister ? 'Create Account' : 'Welcome Back'}</h2>
              <p className="text-secondary">
                {isRegister
                  ? 'Join your organization\'s sustainability journey'
                  : 'Sign in to your EcoSphere account'}
              </p>
            </div>

            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            {/* Google OAuth button */}
            <button className="login-oauth-btn" onClick={handleGoogleLogin} type="button">
              <FcGoogle size={20} />
              <span>Continue with Google</span>
            </button>

            <div className="login-divider">
              <span>or continue with email</span>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              {isRegister && (
                <div className="login-form__row">
                  <div className="login-input-group">
                    <User size={16} className="login-input-icon" />
                    <input
                      type="text"
                      placeholder="First name"
                      value={form.firstName}
                      onChange={update('firstName')}
                      required
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="login-input-group">
                    <User size={16} className="login-input-icon" />
                    <input
                      type="text"
                      placeholder="Last name"
                      value={form.lastName}
                      onChange={update('lastName')}
                      required
                      autoComplete="family-name"
                    />
                  </div>
                </div>
              )}

              <div className="login-input-group">
                <Mail size={16} className="login-input-icon" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={form.email}
                  onChange={update('email')}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="login-input-group">
                <Lock size={16} className="login-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={form.password}
                  onChange={update('password')}
                  required
                  minLength={6}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <button
                type="submit"
                className="login-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <div className="login-spinner" />
                ) : (
                  <>
                    {isRegister ? 'Create Account' : 'Sign In'}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="login-toggle">
              {isRegister ? 'Already have an account?' : "Don't have an account?"}
              <button
                type="button"
                className="login-toggle-btn"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError(null);
                }}
              >
                {isRegister ? 'Sign In' : 'Create Account'}
              </button>
            </div>

            {/* Dev login — only visible in dev */}
            <div className="login-dev">
              <button type="button" className="login-dev-btn" onClick={handleDevLogin}>
                <Sparkles size={14} />
                Quick Demo Login (Seeded Admin)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
