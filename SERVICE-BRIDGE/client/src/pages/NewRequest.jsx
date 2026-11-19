import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, errorText } from '../api.js';
import { CITIES } from '../cities.js';
import '../phase2.css';

export default function NewRequest() {
  const nav = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const [cats, setCats] = useState([]);
  const [city, setCity] = useState('Shivamogga');
  const [gps, setGps] = useState(null);
  const [f, setF] = useState({ category: '', description: '', address: '', preferredDate: today, preferredTime: '10:00', urgency: 'normal', instructions: '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  useEffect(() => { api.get('/categories').then((r) => setCats(r.data.data.items)); }, []);

  const useGps = () => navigator.geolocation.getCurrentPosition(
    (p) => setGps({ lat: p.coords.latitude, lng: p.coords.longitude }),
    () => setError('Location permission denied. Using the city centre instead.')
  );

  async function submit(e) {
    e.preventDefault(); setError('');
    const pos = gps || CITIES[city];
    try { await api.post('/service-requests', { ...f, ...pos }); nav('/customer/requests'); }
    catch (err) { setError(errorText(err)); }
  }

  return (
    <main className="wrap narrow">
      <h1>New service request</h1>
      <form className="card" onSubmit={submit}>
        <label>Service<select value={f.category} onChange={set('category')} required><option value="">Choose…</option>{cats.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label>
        <label>Describe the problem<input value={f.description} onChange={set('description')} required /></label>
        <label>Address<input value={f.address} onChange={set('address')} required /></label>
        <label>City<select value={city} onChange={(e) => { setCity(e.target.value); setGps(null); }}>{Object.keys(CITIES).map((c) => <option key={c}>{c}</option>)}</select></label>
        <button type="button" className="btn ghost" onClick={useGps}>{gps ? 'Using my location' : 'Use my current location'}</button>
        <label>Preferred date<input type="date" min={today} value={f.preferredDate} onChange={set('preferredDate')} required /></label>
        <label>Preferred time<input type="time" value={f.preferredTime} onChange={set('preferredTime')} required /></label>
        <label>Urgency<select value={f.urgency} onChange={set('urgency')}><option value="normal">Normal</option><option value="urgent">Urgent</option><option value="emergency">Emergency</option></select></label>
        <label>Extra instructions (optional)<input value={f.instructions} onChange={set('instructions')} /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn">Post request</button>
        <small>Photo upload will be added with Cloudinary. Your address is shared only with the professional you book.</small>
      </form>
    </main>
  );
}
