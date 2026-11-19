import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorText } from '../api.js';
import VideoRoom from './VideoRoom.jsx';
import '../phase2.css';

export default function AdminVideo() {
  const [items, setItems] = useState([]);
  const [live, setLive] = useState(null);
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState('');
  const load = () => api.get('/video-verification').then((r) => setItems(r.data.data.items)).catch((e) => setMsg(errorText(e)));
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, []);
  const run = async (fn) => { setMsg(''); try { await fn(); await load(); } catch (e) { setMsg(errorText(e)); } };

  return (
    <main className="wrap">
      <Link to="/admin">Back to verification</Link>
      <h1>Video verification</h1>
      {msg && <p className="error" role="alert">{msg}</p>}
      {live && (
        <>
          <VideoRoom sessionId={live} />
          <div className="card">
            <label>Notes (optional)<input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} /></label>
            <div className="row">
              <button className="btn" onClick={() => run(async () => { await api.post(`/video-verification/${live}/result`, { result: 'PASSED', notes }); setLive(null); setNotes(''); })}>Record: passed</button>
              <button className="btn ghost" onClick={() => run(async () => { await api.post(`/video-verification/${live}/result`, { result: 'FAILED', notes }); setLive(null); setNotes(''); })}>Record: failed</button>
            </div>
            <small>After recording a pass, approve the professional on the verification page.</small>
          </div>
        </>
      )}
      <div className="grid">
        {items.map((i) => (
          <div className="card" key={i._id}>
            <strong>{i.professionalId?.userId?.name}</strong>
            <span className={`badge ${i.status === 'REQUESTED' ? 'pending' : i.result === 'FAILED' ? 'rejected' : ''}`}>{i.status}{i.status === 'COMPLETED' && `: ${i.result}`}</span>
            <small>{i.professionalId?.categories?.join(', ')}</small>
            {i.status === 'REQUESTED' && <button className="btn" onClick={() => run(async () => { await api.post(`/video-verification/${i._id}/start`); setLive(i._id); })}>Start call</button>}
            {i.status === 'LIVE' && live !== i._id && <button className="btn ghost" onClick={() => setLive(i._id)}>Rejoin call</button>}
          </div>
        ))}
        {items.length === 0 && <p>No requests yet.</p>}
      </div>
    </main>
  );
}
