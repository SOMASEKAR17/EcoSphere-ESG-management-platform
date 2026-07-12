import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * OAuth callback landing page — /auth/success?token=<jwt>
 * Stores the token from the URL and redirects to the dashboard.
 */
export default function AuthSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('ecosphere_token', token);
      // Fetch user info and store it
      import('../api/endpoints').then(({ getMe }) => {
        getMe()
          .then(({ data }) => {
            localStorage.setItem('ecosphere_user', JSON.stringify(data));
            navigate('/', { replace: true });
          })
          .catch(() => {
            navigate('/', { replace: true });
          });
      });
    } else {
      navigate('/login', { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#0a0e14',
      color: 'rgba(255,255,255,0.5)',
      fontSize: 14,
    }}>
      Signing you in…
    </div>
  );
}
