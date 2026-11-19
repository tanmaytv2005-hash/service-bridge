import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api, errorText } from '../api.js';
import '../phase2.css';

export default function RequestDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState('');
  const load = () => api.get(`/service-requests/${id}`).then((r) => setData(r.data.data)).catch((e) => setMsg(errorText(e)));
  useEffect(() => { load(); }, [id]);
  const run = async (fn, after) => { setMsg(''); try { await fn(); after ? after() : await load(); } catch (e) { setMsg(errorText(e)); } };

  if (!data) return <main className="wrap">{msg ? <p className="error">{msg}</p> : <p>Loading…</p>}</main>;
  const { item, quotations } = data;
  return (
    <main className="wrap">
      <Link to="/customer/requests">Back to requests</Link>
      <h1>{item.category} <span className="badge">{item.status}</span></h1>
      <div className="card"><p>{item.description}</p><small>{item.address} · {item.preferredDate} {item.preferredTime} · {item.urgency}</small></div>
      {msg && <p className="error" role="alert">{msg}</p>}
      <h2>Quotations ({quotations.length})</h2>
      {quotations.length === 0 && <p>Waiting for professionals to respond.</p>}
      <div className="grid">
        {quotations.map((q) => (
          <div className="card" key={q.id}>
            <strong>{q.professional.name}</strong>
            <small>{q.professional.ratingCount ? `★ ${q.professional.ratingAvg} (${q.professional.ratingCount} reviews)` : 'New, no reviews yet'}</small>
            <span style={{ fontSize: 24, fontWeight: 700 }}>₹{q.price}</span>
            <span>{q.professional.experienceYears} years experience{q.etaMinutes != null && ` · arrives in about ${q.etaMinutes} min`}</span>
            {q.message && <small>“{q.message}”</small>}
            <span className="badge">{q.status}</span>
            {item.status === 'open' && q.status === 'submitted' && <button className="btn" onClick={() => run(() => api.post('/bookings', { quotationId: q.id }), () => nav('/bookings'))}>Accept and confirm booking</button>}
          </div>
        ))}
      </div>
      {item.status === 'open' && <p><button className="btn ghost" onClick={() => run(() => api.post(`/service-requests/${id}/cancel`))}>Cancel this request</button></p>}
    </main>
  );
}
