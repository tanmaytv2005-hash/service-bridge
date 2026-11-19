import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { errorText } from '../api.js';
import Brand from '../Brand.jsx';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try { const u = await login(form); nav(`/${u.role}`); }
    catch (err) { setError(errorText(err)); }
    finally { setBusy(false); }
  }

  return (
    <main className="auth-shell">
      <section className="auth-intro">
        <Brand light />
        <span className="auth-chip">Local help, connected</span>
        <h1>Welcome back.</h1>
        <p>Pick up where you left off with trusted local services, clear quotations, and secure bookings.</p>
        <div className="auth-points"><span>✓ Compare local professionals</span><span>✓ Confirm visits with OTP</span></div>
        <span className="auth-decoration auth-decoration-one" aria-hidden="true" />
        <span className="auth-decoration auth-decoration-two" aria-hidden="true" />
      </section>
      <form className="card auth-form" onSubmit={submit}>
        <div className="auth-heading">
          <span className="eyebrow">Your ServiceBridge account</span>
          <h2>Log in</h2>
          <p>Enter your email and password to continue.</p>
        </div>
        <label>Email<input type="email" value={form.email} onChange={set('email')} autoComplete="username" required /></label>
        <label>Password<input type="password" value={form.password} onChange={set('password')} autoComplete="current-password" required /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn auth-submit" disabled={busy}>{busy ? 'Signing in…' : 'Log in'}</button>
        <p className="auth-switch">New to ServiceBridge? <Link to="/register">Create an account</Link></p>
      </form>
    </main>
  );
}
