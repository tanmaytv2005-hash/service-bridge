import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorText } from '../api.js';
import '../phase2.css';

const inr = (paise) => `₹${(paise / 100).toFixed(2)}`;

export default function Referrals() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get('/referrals/mine')
      .then((response) => setData(response.data.data))
      .catch((requestError) => setError(errorText(requestError)));
  }, []);

  const inviteLink = data && `${window.location.origin}/register?ref=${encodeURIComponent(data.referralCode)}`;

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setError('');
    } catch {
      setCopied(false);
      setError('Copy was unavailable. Select and copy the invitation link above.');
    }
  }

  if (error && !data) return <main className="wrap"><p className="error" role="alert">{error}</p></main>;
  if (!data) return <main className="wrap"><p>Loading referral details…</p></main>;

  return (
    <main className="wrap">
      <Link to="/customer">Back to finding professionals</Link>
      <h1>Refer a friend</h1>
      <p>Invite a friend to join ServiceBridge as a customer.</p>

      <section className="card">
        <h2>Your invite</h2>
        <label>Referral code<input value={data.referralCode} readOnly /></label>
        <label>Share this link<input value={inviteLink} readOnly /></label>
        <div className="row">
          <button className="btn" onClick={copyInvite}>{copied ? 'Copied!' : 'Copy invite link'}</button>
          <Link to="/terms">Referral terms</Link>
        </div>
        <small>When your friend completes and pays for their first booking, you earn {inr(data.rewardPaise)} in demo credit. Demo credit is for display only; it cannot be withdrawn or used as a payment.</small>
      </section>

      {error && <p className="error" role="alert">{error}</p>}

      <section className="grid" style={{ marginTop: 20 }}>
        <div className="card"><small>Friends invited</small><strong style={{ fontSize: 22 }}>{data.summary.total}</strong></div>
        <div className="card"><small>Waiting for first paid booking</small><strong style={{ fontSize: 22 }}>{data.summary.pending}</strong></div>
        <div className="card"><small>Demo credit earned</small><strong style={{ fontSize: 22 }}>{inr(data.summary.demoCreditPaise)}</strong></div>
      </section>

      <h2>Your referrals</h2>
      {data.items.length === 0 ? <p>No referrals yet. Share your invite link with a friend.</p> : (
        <div className="grid">
          {data.items.map((item) => (
            <article className="card" key={item._id}>
              <strong>Customer referral</strong>
              <span className={`badge ${item.status === 'PENDING' ? 'pending' : item.status === 'REVERSED' ? 'rejected' : ''}`}>{item.status}</span>
              <small>Joined {new Date(item.createdAt).toLocaleDateString()}</small>
              {item.status === 'REWARDED' && <small>Demo credit earned: {inr(item.rewardPaise)}</small>}
              {item.status === 'REVERSED' && <small>Credit was reversed after the qualifying booking was refunded.</small>}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
