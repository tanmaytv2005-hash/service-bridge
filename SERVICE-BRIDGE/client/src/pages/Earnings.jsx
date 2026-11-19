import { useEffect, useState } from 'react';
import { api, errorText } from '../api.js';
import '../phase2.css';

const inr = (p) => `₹${(p / 100).toFixed(2)}`;

export default function Earnings() {
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState('');
  useEffect(() => { api.get('/payouts/mine').then((r) => setData(r.data.data)).catch((e) => setMsg(errorText(e))); }, []);
  if (!data) return <main className="wrap">{msg ? <p className="error">{msg}</p> : <p>Loading…</p>}</main>;
  const s = data.summary;
  return (
    <main className="wrap">
      <h1>Earnings</h1>
      <div className="grid">
        {[['Gross service amount', s.grossPaise], ['Platform commission', s.commissionPaise], ['Your earnings', s.netPaise], ['Awaiting payout', s.pendingPaise], ['Paid out', s.paidPaise]].map(([l, v]) => (
          <div className="card" key={l}><small>{l}</small><strong style={{ fontSize: 22 }}>{inr(v || 0)}</strong></div>
        ))}
      </div>
      <h2>Transactions</h2>
      {data.items.length === 0 && <p>No earnings yet. They appear after a customer pays for a completed job.</p>}
      <div className="grid">
        {data.items.map((i) => (
          <div className="card" key={i._id}>
            <strong>{i.bookingId?.requestId?.category}</strong> <span className={`badge ${i.status === 'CANCELLED' ? 'rejected' : i.status === 'PENDING' ? 'pending' : ''}`}>{i.status}</span>
            <span>Gross {inr(i.grossPaise)} · Commission {inr(i.commissionPaise)}</span>
            <span>You receive {inr(i.amountPaise)}</span>
            {i.reference && <small>Settlement ref: {i.reference}</small>}
          </div>
        ))}
      </div>
      <small>Payouts are recorded by the admin in this prototype. Fees and taxes are not modelled.</small>
    </main>
  );
}
