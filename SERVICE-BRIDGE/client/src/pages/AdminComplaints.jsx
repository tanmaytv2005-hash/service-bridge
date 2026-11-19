import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorText } from '../api.js';
import '../phase2.css';

const STATUSES = ['', 'OPEN', 'UNDER_INVESTIGATION', 'RESOLVED', 'REJECTED'];

export default function AdminComplaints() {
  const [status, setStatus] = useState('OPEN');
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState('');
  const load = () => api.get('/complaints', { params: status ? { status } : {} }).then((r) => setItems(r.data.data.items)).catch((e) => setMsg(errorText(e)));
  useEffect(() => { load(); }, [status]);
  async function move(id, next, askNote) {
    let decision;
    if (askNote) { decision = window.prompt('Decision note (visible to the person who complained)'); if (!decision) return; }
    setMsg('');
    try { await api.patch(`/complaints/${id}`, { status: next, decision }); await load(); } catch (e) { setMsg(errorText(e)); }
  }
  return (
    <main className="wrap">
      <Link to="/admin">Back to verification</Link>
      <h1>Complaints</h1>
      <label style={{ maxWidth: 260 }}>Show<select value={status} onChange={(e) => setStatus(e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{s ? s.replace('_', ' ').toLowerCase() : 'all'}</option>)}</select></label>
      {msg && <p className="error" role="alert">{msg}</p>}
      {items.length === 0 && <p>No complaints with this status.</p>}
      <div className="grid" style={{ marginTop: 16 }}>
        {items.map((c) => (
          <div className="card" key={c._id}>
            <strong>{c.type.replace('_', ' ')}</strong> <span className={`badge ${c.status === 'OPEN' ? 'pending' : c.status === 'REJECTED' ? 'rejected' : ''}`}>{c.status.replace('_', ' ')}</span>
            <span>{c.description}</span>
            <small>From {c.raisedBy?.name} ({c.raisedByRole}) about {c.againstUserId?.name} · booking …{String(c.bookingId).slice(-6)}</small>
            {c.adminDecision && <small>Decision: {c.adminDecision}</small>}
            {(c.status === 'OPEN' || c.status === 'UNDER_INVESTIGATION') && (
              <div className="row">
                {c.status === 'OPEN' && <button className="btn ghost" onClick={() => move(c._id, 'UNDER_INVESTIGATION')}>Investigate</button>}
                <button className="btn" onClick={() => move(c._id, 'RESOLVED', true)}>Resolve</button>
                <button className="btn ghost" onClick={() => move(c._id, 'REJECTED', true)}>Reject</button>
              </div>
            )}
          </div>
        ))}
      </div>
      <small>Refunds for payment disputes are handled on the Payments page.</small>
    </main>
  );
}
