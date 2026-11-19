import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { errorText } from '../api.js';
import Brand from '../Brand.jsx';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'customer', city: 'Shivamogga' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try { const u = await register(form); nav(`/${u.role}`); }
    catch (err) { setError(errorText(err)); }
    finally { setBusy(false); }
  }

  return (
    <main className="auth-shell auth-shell-register">
      <section className="auth-intro">
        <Brand light />
        <span className="auth-chip">Join your local service community</span>
        <h1>Good work starts with a connection.</h1>
        <p>Create an account to find help for your home or apply to offer services in your city.</p>
        <div className="auth-points"><span>✓ Choose your account type</span><span>✓ Get started in a few steps</span></div>
        <span className="auth-decoration auth-decoration-one" aria-hidden="true" />
        <span className="auth-decoration auth-decoration-two" aria-hidden="true" />
      </section>
      <form className="card auth-form" onSubmit={submit}>
        <div className="auth-heading">
          <span className="eyebrow">Create your profile</span>
          <h2>Sign up</h2>
          <p>Choose how you want to use ServiceBridge.</p>
        </div>
        <label>I am a
          <select value={form.role} onChange={set('role')}>
            <option value="customer">Customer</option>
            <option value="professional">Service professional</option>
          </select>
        </label>
        <label>Full name<input value={form.name} onChange={set('name')} autoComplete="name" required /></label>
        <label>Email<input type="email" value={form.email} onChange={set('email')} autoComplete="email" required /></label>
        <label>Mobile number<input inputMode="numeric" maxLength={10} value={form.phone} onChange={set('phone')} autoComplete="tel" required /></label>
        <label>City
          <select value={form.city} onChange={set('city')}>
            <option>Shivamogga</option>
            <option>Bengaluru</option>
          </select>
        </label>
        <label>Password<input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" minLength={8} required /></label>
        <small>Use at least 8 characters, including a letter and a number.</small>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn auth-submit" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
      </form>
    </main>
  );
}
