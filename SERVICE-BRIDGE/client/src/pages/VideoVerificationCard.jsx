import { useEffect, useState } from 'react';
import { api, errorText } from '../api.js';
import { socket } from '../socket.js';
import VideoRoom from './VideoRoom.jsx';

export default function VideoVerificationCard() {
  const [s, setS] = useState(undefined);
  const [msg, setMsg] = useState('');
  const [joined, setJoined] = useState(false);
  const load = () => api.get('/video-verification/mine').then((r) => setS(r.data.data.session)).catch((e) => setMsg(errorText(e)));
  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    socket.on('notification', load);
    return () => { clearInterval(t); socket.off('notification', load); };
  }, []);

  async function request() {
    setMsg('');
    try { await api.post('/video-verification/request'); await load(); } catch (e) { setMsg(errorText(e)); }
  }
  if (s === undefined) return null;
  return (
    <>
      <h2>Live video verification</h2>
      <div className="card">
        {(!s || (s.status === 'COMPLETED' && s.result === 'FAILED')) && <button className="btn" onClick={request}>Request video verification</button>}
        {s?.status === 'REQUESTED' && <p>Requested. An admin will start the call. This page updates by itself.</p>}
        {s?.status === 'LIVE' && !joined && <button className="btn" onClick={() => setJoined(true)}>Join video call</button>}
        {s?.status === 'LIVE' && joined && <VideoRoom sessionId={s._id} />}
        {s?.status === 'COMPLETED' && <p>Last result: <strong>{s.result}</strong>{s.notes && ` (${s.notes})`}</p>}
        {msg && <p className="error" role="alert">{msg}</p>}
        <small>Allow camera and microphone when asked. Use fake or demo details only in this prototype.</small>
      </div>
    </>
  );
}
