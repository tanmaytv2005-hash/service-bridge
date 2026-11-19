import { Link } from 'react-router-dom';

export default function Brand({ light = false, compact = false }) {
  return (
    <Link
      to="/"
      className={`brand${light ? ' brand-light' : ''}${compact ? ' brand-compact' : ''}`}
      aria-label="ServiceBridge home"
    >
      <span className="brand-mark" aria-hidden="true">
        <img
          src="/servicebridge-logo.png"
          alt=""
          draggable="false"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </span>

      <span className="brand-name">
        <span>Service</span>
        <strong>Bridge</strong>
      </span>
    </Link>
  );
}