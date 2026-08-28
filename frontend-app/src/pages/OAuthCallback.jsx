import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      setError('No authorization code received.');
      return;
    }

    const redirectUri = `${window.location.origin}/oauth/callback`;
    login(code, redirectUri)
      .then((userData) => {
        if (userData.requires_role_selection) {
          navigate('/select-role', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      })
      .catch((err) => {
        setError(err.response?.data?.error?.message || 'Authentication failed. Please try again.');
      });
  }, [searchParams, login, navigate]);

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '16px', padding: '20px' }}>
        <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px 20px', borderRadius: '8px', fontSize: '14px' }}>
          {error}
        </div>
        <a href="/login" style={{ color: '#15803d', fontWeight: 600 }}>Return to sign in</a>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="spinner" />
      <p style={{ marginTop: '16px', color: '#64748b', fontSize: '14px' }}>Signing you in...</p>
    </div>
  );
}
