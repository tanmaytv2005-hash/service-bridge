import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorText } from '../api.js';
import '../phase2.css';

export default function MyRequests() {
  const [items, setItems] = useState(null);
  const [msg, setMsg] = useState('');
  useEffect(() => { api.get('/service-requests/mine').then((r) => setItems(r.data.data.items)).catch((e) => setMsg(errorText(e))); }, []);
  return (
    <main className="wrap">
      <div className="row" style={{ justifyContent: 'space-between' }}><h1>My requests</h1><Link to="/customer/requests/new" className="btn">New request</Link></div>
      {msg && <p className="error">{msg}</p>}
      {items?.length === 0 && <p>No requests yet.</p>}
      <div className="grid">
        {items?.map((i) => (
          <Link key={i._id} to={`/customer/requests/${i._id}`} className="card" style={{ color: 'inherit' }}>
            <strong>{i.category}</strong> <span className={`badge ${i.status === 'open' ? 'pending' : i.status === 'cancelled' ? 'rejected' : ''}`}>{i.status}</span>
            <span>{i.description}</span>
            <small>{i.preferredDate} {i.preferredTime} · {i.quotationCount} quotation(s)</small>
          </Link>
        ))}
      </div>
    </main>
  );
}
