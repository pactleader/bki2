import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api.js';
import { saveAuth, isLoggedIn } from '../auth.js';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  if (isLoggedIn()) { navigate('/admin'); return null; }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      saveAuth(data.token, data.user);
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--primary)',
    }}>
      <div style={{
        background: '#fff', borderRadius: 10, padding: 40,
        width: 380, boxShadow: '0 20px 60px rgba(0,0,0,.3)',
      }}>
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--primary)' }}>The Background Investigator</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Admin Panel</div>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', color: 'var(--danger)',
            padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13,
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, fontSize: 13 }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required autoFocus
              style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 14 }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, fontSize: 13 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                required
                style={{ width: '100%', padding: '9px 40px 9px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
              />
              <button type="button" onClick={() => setShowPw(v => !v)} style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
              }}>
                {showPw ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '10px', background: 'var(--primary)',
            color: '#fff', border: 'none', borderRadius: 6, fontSize: 14,
            fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .7 : 1,
          }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
