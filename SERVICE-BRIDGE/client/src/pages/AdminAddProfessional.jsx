import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, errorText } from '../api.js';
import '../phase2.css';

export default function AdminAddProfessional() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', city: 'Shivamogga', tempPassword: '', categories: [], skills: '', experienceYears: 0, lat: '', lng: '' });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get('/categories').then((r) => setCategories(r.data.data.items)).catch((e) => setMsg(errorText(e))); }, []);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const toggle = (slug) => setForm({ ...form, categories: form.categories.includes(slug) ? form.categories.filter((x) => x !== slug) : [...form.categories, slug] });

  async function submit(e) {
    e.preventDefault(); setBusy(true); setMsg('');
    const body = { ...form, skills: form.skills.split(',').map((x) => x.trim()).filter(Boolean), experienceYears: Number(form.experienceYears) };
    delete body.lat; delete body.lng;
    if (form.lat !== '' && form.lng !== '') { body.lat = Number(form.lat); body.lng = Number(form.lng); }
    try {
      await api.post('/admin/professionals', body);
      setMsg('Professional added and approved. Share the temporary password with them privately. They can add a camera photo and set a service location after signing in.');
      setTimeout(() => navigate('/admin'), 1400);
    } catch (e) { setMsg(errorText(e)); }
    finally { setBusy(false); }
  }

  return (
    <main className="wrap narrow">
      <Link to="/admin">Back to admin</Link>
      <h1>Add professional</h1>
      <p>This creates an approved professional account. Keep the temporary password private.</p>
      <form className="card" onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
        <label>Full name<input value={form.name} onChange={set('name')} required minLength={2} maxLength={80} /></label>
        <label>Email<input type="email" value={form.email} onChange={set('email')} required /></label>
        <label>Mobile number<input inputMode="numeric" maxLength={10} value={form.phone} onChange={set('phone')} required /></label>
        <label>City<select value={form.city} onChange={set('city')}><option>Shivamogga</option><option>Bengaluru</option></select></label>
        <label>Temporary password<input type="password" value={form.tempPassword} onChange={set('tempPassword')} required minLength={8} /><small>Use at least 8 characters, including a letter and number.</small></label>
        <fieldset><legend>Service categories</legend><div className="checks">{categories.map((c) => <label key={c.slug}><input type="checkbox" checked={form.categories.includes(c.slug)} onChange={() => toggle(c.slug)} />{c.name}</label>)}</div></fieldset>
        <label>Skills, separated by commas<input value={form.skills} onChange={set('skills')} /></label>
        <label>Years of experience<input type="number" min="0" max="60" value={form.experienceYears} onChange={set('experienceYears')} /></label>
        <div className="row"><label>Latitude (optional)<input type="number" min="-90" max="90" step="any" value={form.lat} onChange={set('lat')} /></label><label>Longitude (optional)<input type="number" min="-180" max="180" step="any" value={form.lng} onChange={set('lng')} /></label></div>
        {msg && <p className={msg.startsWith('Professional added') ? 'ok' : 'error'} role="alert">{msg}</p>}
        <button className="btn" disabled={busy || form.categories.length === 0}>{busy ? 'Adding…' : 'Add and approve'}</button>
      </form>
    </main>
  );
}
