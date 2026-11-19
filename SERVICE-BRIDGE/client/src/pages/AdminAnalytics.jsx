import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorText } from '../api.js';
import '../phase2.css';

const inr = (p) => `₹${(p / 100).toFixed(2)}`;
const sum = (o = {}) => Object.values(o).reduce((a, b) => a + b, 0);

export default function AdminAnalytics() {
  const [d, setD] = useState(null);
  const [msg, setMsg] = useState('');
  useEffect(() => { api.get('/admin/analytics').then((r) => setD(r.data.data)).catch((e) => setMsg(errorText(e))); }, []);
  if (!d) return <main className="wrap">{msg ? <p className="error">{msg}</p> : <p>Loading…</p>}</main>;
  const max = Math.max(1, ...d.daily.map((x) => x.n));
  const cards = [
    ['Customers', d.customers], ['Professionals', sum(d.professionals)], ['Pending verification', d.professionals.under_review || 0], ['Approved', d.professionals.approved || 0],
    ['Service requests', d.requests], ['Bookings', sum(d.bookings)], ['Active bookings', (d.bookings.CONFIRMED || 0) + (d.bookings.IN_PROGRESS || 0) + (d.bookings.COMPLETION_PENDING || 0)],
    ['Completed', d.bookings.COMPLETED || 0], ['Cancelled', d.bookings.CANCELLED || 0], ['Paid transactions', d.revenue.paidCount], ['Gross collected', inr(d.revenue.grossPaise)],
    ['Platform commission', inr(d.revenue.commissionPaise)], ['Open complaints', (d.complaints.OPEN || 0) + (d.complaints.UNDER_INVESTIGATION || 0)], ['Average rating', d.rating.count ? `${d.rating.avg} (${d.rating.count})` : '–'],
  ];
  return (
    <main className="wrap">
      <Link to="/admin">Back to verification</Link>
      <h1>Analytics</h1>
      <div className="grid">{cards.map(([l, v]) => <div className="card" key={l}><small>{l}</small><strong style={{ fontSize: 22 }}>{v}</strong></div>)}</div>
      <h2>Bookings in the last 14 days</h2>
      <div className="card">
        {d.daily.length === 0 && <p>No bookings in this period.</p>}
        {d.daily.map((x) => (
          <div key={x.date} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 30px', gap: 8, alignItems: 'center' }}>
            <small>{x.date}</small><div style={{ background: 'var(--g)', height: 14, borderRadius: 7, width: `${(x.n / max) * 100}%` }} /><span>{x.n}</span>
          </div>
        ))}
      </div>
      <h2>Most requested services</h2>
      <div className="card">{d.topCategories.length === 0 ? <p>No requests yet.</p> : d.topCategories.map((c) => <div key={c.category} className="row" style={{ justifyContent: 'space-between' }}><span>{c.category}</span><strong>{c.n}</strong></div>)}</div>
    </main>
  );
}
