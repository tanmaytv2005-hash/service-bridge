import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorText } from '../api.js';
import { CITIES } from '../cities.js';
import MapView from './MapView.jsx';
import ReviewList from './ReviewList.jsx';
import '../phase2.css';

export default function CustomerHome() {
  const [cats, setCats] = useState([]);
  const [place, setPlace] = useState('Shivamogga'); // city name or 'gps'
  const [gps, setGps] = useState(null);
  const [category, setCategory] = useState('');
  const [radiusKm, setRadiusKm] = useState(10);
  const [minExperience, setMinExperience] = useState(0);
  const [minRating, setMinRating] = useState(0);
  const [items, setItems] = useState(null);
  const [msg, setMsg] = useState('');

  const center = place === 'gps' && gps ? gps : CITIES[place] || CITIES.Shivamogga;

  useEffect(() => { api.get('/categories').then((r) => setCats(r.data.data.items)).catch((e) => setMsg(errorText(e))); }, []);
  useEffect(() => {
    setItems(null);
    api.get('/locations/nearby', { params: { lat: center.lat, lng: center.lng, radiusKm, minExperience, minRating, ...(category && { category }) } })
      .then((r) => { setItems(r.data.data.items); setMsg(''); })
      .catch((e) => { setItems([]); setMsg(errorText(e)); });
  }, [center.lat, center.lng, category, radiusKm, minExperience, minRating]);

  function useMyLocation() {
    if (!navigator.geolocation) return setMsg('Your browser has no location support. Choose a city instead.');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setPlace('gps'); },
      () => setMsg('Location permission denied. Choose your city instead.')
    );
  }

  return (
    <main className="wrap">
      <div className="row" style={{ justifyContent: 'space-between' }}><h1>Find professionals near you</h1><Link to="/customer/requests/new" className="btn">Create a service request</Link></div>
      <div className="card">
        <div className="row">
          <label>City
            <select value={place === 'gps' ? '' : place} onChange={(e) => setPlace(e.target.value)}>
              {place === 'gps' && <option value="">My location</option>}
              {Object.keys(CITIES).map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <button className="btn ghost" onClick={useMyLocation}>Use my location</button>
          <label>Service
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All services</option>
              {cats.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </label>
          <label>Distance
            <select value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))}>
              {[5, 10, 25, 50].map((r) => <option key={r} value={r}>Within {r} km</option>)}
            </select>
          </label>
          <label>Experience
            <select value={minExperience} onChange={(e) => setMinExperience(Number(e.target.value))}>
              <option value={0}>Any</option><option value={2}>2+ years</option><option value={5}>5+ years</option>
            </select>
          </label>
        </div>
        <label style={{ maxWidth: 200 }}>Minimum rating<select value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}><option value={0}>Any</option><option value={3}>3 stars and up</option><option value={4}>4 stars and up</option></select></label>
        <small>The price filter comes with quotations.</small>
      </div>
      {msg && <p className="error" role="alert">{msg}</p>}
      {items && <MapView center={center} items={items} />}
      <h2>{items === null ? 'Searching…' : `${items.length} professional(s) found`}</h2>
      {items?.length === 0 && !msg && <p>No professionals found. Try a larger distance or another service.</p>}
      <div className="grid">
        {items?.map((i) => (
          <div className="card" key={i.id}>
            <strong>{i.name}</strong> <span className="badge">Verified</span>
            <span>{i.categories.join(', ')}</span>
            <span>{i.ratingCount ? `★ ${i.ratingAvg} (${i.ratingCount} reviews)` : 'New, no reviews yet'}</span>
            <span>{i.experienceYears} years experience · {i.distanceKm} km away · {i.availability}</span>
            <ReviewList professionalId={i.id} />
          </div>
        ))}
      </div>
    </main>
  );
}
