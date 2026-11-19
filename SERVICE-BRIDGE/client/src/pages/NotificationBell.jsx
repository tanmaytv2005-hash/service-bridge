import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { socket } from '../socket.js';

export default function NotificationBell() {
  const [n, setN] = useState(0);
  useEffect(() => {
    api.get('/notifications').then((r) => setN(r.data.data.unreadCount)).catch(() => {});
    if (!socket.connected) socket.connect();
    const add = () => setN((x) => x + 1);
    const clear = () => setN(0);
    socket.on('notification', add);
    window.addEventListener('notif-read', clear);
    return () => { socket.off('notification', add); window.removeEventListener('notif-read', clear); };
  }, []);
  return <Link to="/notifications">Notifications {n > 0 && <span className="badge pending">{n}</span>}</Link>;
}
