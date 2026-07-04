import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, token } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@configflow.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (token) navigate('/', { replace: true });

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={onSubmit}>
        <h1>ConfigFlow</h1>
        <p className="muted">Sign in to manage your orchestration workflows.</p>
        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        <label>Password</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        {error && <div className="error-text">{error}</div>}
        <button className="btn" type="submit" style={{ marginTop: 16, width: '100%' }} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
        <p className="muted" style={{ marginTop: 12 }}>
          Default credentials come from ADMIN_EMAIL / ADMIN_PASSWORD in backend/.env (seeded via <code>npm run seed</code>).
        </p>
      </form>
    </div>
  );
}
