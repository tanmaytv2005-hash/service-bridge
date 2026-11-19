import { useEffect, useRef } from 'react';

let loader;
function loadMaps(key) {
  if (window.google?.maps) return Promise.resolve();
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?key=${key}`;
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  return loader;
}

export default function MapView({ center, items }) {
  const key = import.meta.env.VITE_GOOGLE_MAPS_KEY;
  const ref = useRef(null);

  useEffect(() => {
    if (!key) return;
    let stop = false;
    loadMaps(key).then(() => {
      if (stop || !ref.current) return;
      const map = new window.google.maps.Map(ref.current, { center, zoom: 13 });
      new window.google.maps.Marker({ position: center, map, title: 'Search centre' });
      items.forEach((i) => new window.google.maps.Marker({ position: { lat: i.location.coordinates[1], lng: i.location.coordinates[0] }, map, title: i.name }));
    }).catch(() => {});
    return () => { stop = true; };
  }, [key, center.lat, center.lng, items]);

  if (!key) return <p className="card">Map is hidden. Add VITE_GOOGLE_MAPS_KEY to client/.env to show Google Maps. Search results still work without it.</p>;
  return <div ref={ref} style={{ height: 360, borderRadius: 16 }} />;
}
