import { useState } from 'react';
import { api, errorText } from '../api.js';
import { CITIES } from '../cities.js';

export default function ProfessionalLocation({ profile, onChange }) {
  const [msg, setMsg] = useState('');
  const save = async (fn, ok) => { try { await fn(); await onChange(); setMsg(ok); } catch (e) { setMsg(errorText(e)); } };
  const putLoc = (lat, lng) => api.put('/professionals/location', { lat, lng });

  const gps = () => navigator.geolocation.getCurrentPosition(
    (pos) => save(() => putLoc(pos.coords.latitude, pos.coords.longitude), 'Location saved'),
    () => setMsg('Permission denied. Use your city centre instead.')
  );

  return (
    <>
      <h2>Location and availability</h2>
      <div className="card">
        <p>{profile.location ? 'Your service location is saved.' : 'No location saved. Customers cannot find you until you set one.'}</p>
        <div className="row">
          <button className="btn ghost" onClick={gps}>Use my current location</button>
          {Object.entries(CITIES).map(([n, c]) => <button key={n} className="btn ghost" onClick={() => save(() => putLoc(c.lat, c.lng), `Location set to ${n} centre`)}>{n} centre</button>)}
        </div>
        <label>Availability
          <select value={profile.availability} onChange={(e) => save(() => api.put('/professionals/availability', { availability: e.target.value }), 'Availability updated')}>
            <option value="available">Available</option><option value="busy">Busy</option><option value="offline">Offline</option>
          </select>
        </label>
        {msg && <p className="ok" role="status">{msg}</p>}
        <small>Only approved professionals who are not offline appear in customer searches.</small>
      </div>
    </>
  );
}
