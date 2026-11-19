import { useEffect, useState } from 'react';
import { api, errorText } from '../api.js';
import { stars } from './ReviewList.jsx';
import '../phase2.css';

export default function ProfessionalReviews() {
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState('');
  useEffect(() => { api.get('/reviews/mine').then((r) => setData(r.data.data)).catch((e) => setMsg(errorText(e))); }, []);
  if (!data) return <main className="wrap">{msg ? <p className="error">{msg}</p> : <p>Loading…</p>}</main>;
  return (
    <main className="wrap">
      <h1>Reviews</h1>
      <div className="card"><strong style={{ fontSize: 28 }}>{data.ratingCount ? data.ratingAvg : '–'}</strong><span>{data.ratingCount} review(s)</span></div>
      {data.items.length === 0 && <p>No reviews yet. They appear after customers rate completed jobs.</p>}
      <div className="grid">{data.items.map((r) => <div className="card" key={r.id}><span aria-label={`${r.rating} out of 5`}>{stars(r.rating)}</span><span>{r.comment || <small>No comment</small>}</span><small>{r.customer} · {new Date(r.createdAt).toLocaleDateString()}</small></div>)}</div>
    </main>
  );
}
