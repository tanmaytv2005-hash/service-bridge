import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorText } from '../api.js';

export default function AdminCategories() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const load = () => api.get('/categories', { params: { all: 1 } }).then((r) => setItems(r.data.data.items)).catch((e) => setMsg(errorText(e)));
  useEffect(() => { load(); }, []);
  const run = async (fn) => { setMsg(''); try { await fn(); await load(); } catch (e) { setMsg(errorText(e)); } };

  return (
    <main className="wrap narrow">
      <Link to="/admin">Back to verification</Link>
      <h1>Service categories</h1>
      <form className="card" onSubmit={(e) => { e.preventDefault(); run(async () => { await api.post('/categories', { name }); setName(''); }); }}>
        <label>New category<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
        <button className="btn">Add category</button>
      </form>
      {msg && <p className="error" role="alert">{msg}</p>}
      <div className="card" style={{ marginTop: 16 }}>
        {items.map((c) => (
          <div className="row" key={c._id} style={{ justifyContent: 'space-between', padding: 12, borderBottom: '1px solid #ddd' }}>
            <strong>{c.name} {!c.isActive && <em>(inactive)</em>}</strong>
            <label style={{ maxWidth: 170 }}>Commission %
              <input type="number" min="0" max="50" step="0.1" value={c.commissionPercent ?? 15} onChange={(e) => setItems(items.map((x) => x._id === c._id ? { ...x, commissionPercent: Number(e.target.value) } : x))} />
            </label>
            <button className="btn" onClick={() => run(() => api.patch(`/categories/${c._id}`, { commissionPercent: Number(c.commissionPercent) }))}>Save rate</button>
            <button className="btn ghost" onClick={() => run(() => api.patch(`/categories/${c._id}`, { isActive: !c.isActive }))}>{c.isActive ? 'Deactivate' : 'Activate'}</button>
          </div>
        ))}
      </div>
    </main>
  );
}
