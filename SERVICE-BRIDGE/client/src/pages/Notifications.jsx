import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorText } from '../api.js';
import '../phase2.css';

export default function Notifications() {
  const [items, setItems] = useState(null);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    api.get('/notifications').then(async (r) => {
      setItems(r.data.data.items);
      await api.post('/notifications/read-all');
      window.dispatchEvent(new Event('notif-read'));
    }).catch((e) => setMsg(errorText(e)));
  }, []);
  return (
    <main className="wrap narrow">
      <h1>Notifications</h1>
      {msg && <p className="error">{msg}</p>}
      {items?.length === 0 && <p>Nothing yet.</p>}
      <div style={{ display: 'grid', gap: 10 }}>
        {items?.map((n) => (
          <div className="card" key={n._id} style={n.readAt ? {} : { borderLeft: '4px solid var(--g)' }}>
            <strong>{n.title}</strong>
            {n.body && <span>{n.body}</span>}
            <small>{new Date(n.createdAt).toLocaleString()} {n.link && <>· <Link to={n.link}>Open</Link></>}</small>
          </div>
        ))}
      </div>
    </main>
  );
}
