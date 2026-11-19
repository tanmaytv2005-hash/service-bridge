import { useEffect, useState } from 'react';
import { api, errorText } from '../api.js';
import '../phase2.css';

function QuoteForm({ requestId, onDone }) {
  const [f, setF] = useState({ price: '', etaMinutes: '', message: '' });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function send(e) {
    e.preventDefault(); setErr('');
    try { await api.post('/quotations', { requestId, price: f.price, ...(f.etaMinutes !== '' && { etaMinutes: f.etaMinutes }), message: f.message }); onDone(); }
    catch (x) { setErr(errorText(x)); }
  }
  return (
    <form onSubmit={send} style={{ display: 'grid', gap: 8 }}>
      <label>Price (₹)<input type="number" min="1" value={f.price} onChange={set('price')} required /></label>
      <label>Arrival in (minutes, optional)<input type="number" min="0" value={f.etaMinutes} onChange={set('etaMinutes')} /></label>
      <label>Message (optional)<input value={f.message} onChange={set('message')} maxLength={300} /></label>
      {err && <p className="error" role="alert">{err}</p>}
      <button className="btn">Send quotation</button>
    </form>
  );
}

export default function ProfessionalRequests() {
  const [items, setItems] = useState(null);
  const [msg, setMsg] = useState('');
  const load = () => api.get('/service-requests/eligible').then((r) => setItems(r.data.data.items)).catch((e) => { setItems([]); setMsg(errorText(e)); });
  useEffect(() => { load(); }, []);
  return (
    <main className="wrap">
      <h1>Requests near you</h1>
      {msg && <p className="error" role="alert">{msg}</p>}
      {items?.length === 0 && !msg && <p>No open requests in your categories within 25 km.</p>}
      <div className="grid">
        {items?.map((i) => (
          <div className="card" key={i.id}>
            <strong>{i.category}</strong> {i.urgency !== 'normal' && <span className="badge rejected">{i.urgency}</span>}
            <span>{i.description}</span>
            <small>{i.preferredDate} {i.preferredTime} · {i.distanceKm} km away</small>
            {i.myQuotation ? <span className="badge">You quoted ₹{i.myQuotation.price} ({i.myQuotation.status})</span> : <QuoteForm requestId={i.id} onDone={load} />}
          </div>
        ))}
      </div>
    </main>
  );
}
