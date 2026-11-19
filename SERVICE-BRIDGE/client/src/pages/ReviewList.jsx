import { useState } from 'react';
import { api, errorText } from '../api.js';

export const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

export default function ReviewList({ professionalId }) {
  const [items, setItems] = useState(null);
  const [msg, setMsg] = useState('');
  const toggle = async () => {
    if (items) return setItems(null);
    try { setItems((await api.get(`/reviews/professional/${professionalId}`)).data.data.items); } catch (e) { setMsg(errorText(e)); }
  };
  return (
    <div>
      <button className="btn ghost" onClick={toggle}>{items ? 'Hide reviews' : 'Show reviews'}</button>
      {msg && <p className="error">{msg}</p>}
      {items?.length === 0 && <p><small>No reviews yet.</small></p>}
      {items?.map((r) => <p key={r.id} style={{ margin: '8px 0' }}><span aria-label={`${r.rating} out of 5`}>{stars(r.rating)}</span> <small>{r.customer}</small><br />{r.comment}</p>)}
    </div>
  );
}
