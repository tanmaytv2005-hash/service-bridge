import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorText } from '../api.js';
import '../phase2.css';

const inr = (p) => `₹${(p / 100).toFixed(2)}`;

export default function AdminPayments() {
  const [pay, setPay] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [msg, setMsg] = useState('');
  const load = async () => {
    try { setPay((await api.get('/payments')).data.data); setPayouts((await api.get('/payouts')).data.data.items); }
    catch (e) { setMsg(errorText(e)); }
  };
  useEffect(() => { load(); }, []);
  const run = async (fn) => { setMsg(''); try { await fn(); await load(); } catch (e) { setMsg(errorText(e)); } };

  if (!pay) return <main className="wrap">{msg ? <p className="error">{msg}</p> : <p>Loading…</p>}</main>;
  const s = pay.summary;
  return (
    <main className="wrap">
      <Link to="/admin">Back to verification</Link>
      <h1>Payments and payouts</h1>
      {msg && <p className="error" role="alert">{msg}</p>}
      <div className="grid">
        {[['Paid transactions', s.paidCount], ['Gross collected', inr(s.grossPaise)], ['Platform commission', inr(s.commissionPaise)], ['Failed', s.failedCount], ['Refunded', s.refundedCount]].map(([l, v]) => <div className="card" key={l}><small>{l}</small><strong style={{ fontSize: 22 }}>{v}</strong></div>)}
      </div>
      <p><small>Each payment keeps the commission rate set for its service category when checkout started.</small></p>
      <h2>Transactions</h2>
      <div className="grid">
        {pay.items.map((p) => (
          <div className="card" key={p._id}>
            <strong>{inr(p.amountPaise)}</strong> <span className={`badge ${p.status === 'PAID' ? '' : p.status === 'CREATED' ? 'pending' : 'rejected'}`}>{p.status}</span>
            <small>Booking …{String(p.bookingId).slice(-6)} · rate {p.commissionPercentSnapshot ?? 15}% · commission {inr(p.commissionPaise)} · share {inr(p.professionalSharePaise)}</small>
            {p.refundStatus !== 'NONE' && <small>Refund: {p.refundStatus}{p.refundReason && ` (“${p.refundReason}”)`}</small>}
            {p.refundStatus === 'REQUESTED' && <div className="row"><button className="btn" onClick={() => run(() => api.post(`/payments/${p._id}/refund/decision`, { decision: 'approve' }))}>Approve refund</button><button className="btn ghost" onClick={() => run(() => api.post(`/payments/${p._id}/refund/decision`, { decision: 'reject' }))}>Reject</button></div>}
          </div>
        ))}
      </div>
      <h2>Professional payouts</h2>
      <div className="grid">
        {payouts.map((p) => (
          <div className="card" key={p._id}>
            <strong>{p.professionalId?.userId?.name}</strong> <span className={`badge ${p.status === 'PENDING' ? 'pending' : p.status === 'CANCELLED' ? 'rejected' : ''}`}>{p.status}</span>
            <span>{inr(p.amountPaise)} of {inr(p.grossPaise)}</span>
            {p.status === 'PENDING' && <button className="btn ghost" onClick={() => { const reference = window.prompt('Settlement reference (for example a bank transfer ID)'); if (reference) run(() => api.patch(`/payouts/${p._id}/mark-paid`, { reference })); }}>Mark as paid</button>}
          </div>
        ))}
      </div>
    </main>
  );
}
