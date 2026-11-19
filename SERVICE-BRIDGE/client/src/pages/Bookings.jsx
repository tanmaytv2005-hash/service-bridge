import { useEffect, useState } from 'react';
import { api, errorText } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import '../phase2.css';

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve; s.onerror = () => reject(new Error('Could not load the payment window'));
    document.body.appendChild(s);
  });
}

const STEP = { CONFIRMED: 'arrival', COMPLETION_PENDING: 'completion' };

function ReviewBox({ b, reload }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [err, setErr] = useState('');
  async function send(e) {
    e.preventDefault(); setErr('');
    try { await api.post('/reviews', { bookingId: b._id, rating, comment }); await reload(); } catch (x) { setErr(errorText(x)); }
  }
  return (
    <form onSubmit={send} style={{ display: 'grid', gap: 8 }}>
      <strong>Rate this professional</strong>
      <label>Rating<select value={rating} onChange={(e) => setRating(Number(e.target.value))}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)} ({n})</option>)}</select></label>
      <label>Comment (optional)<input value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} /></label>
      {err && <p className="error" role="alert">{err}</p>}
      <button className="btn ghost">Submit review</button>
    </form>
  );
}

function ComplaintBox({ b, reload }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('service_quality');
  const [description, setDescription] = useState('');
  const [err, setErr] = useState('');
  async function send(e) {
    e.preventDefault(); setErr('');
    try { await api.post('/complaints', { bookingId: b._id, type, description }); setOpen(false); await reload(); } catch (x) { setErr(errorText(x)); }
  }
  if (!open) return <button className="btn ghost" onClick={() => setOpen(true)}>Report a problem</button>;
  return (
    <form onSubmit={send} style={{ display: 'grid', gap: 8 }}>
      <label>Type<select value={type} onChange={(e) => setType(e.target.value)}><option value="service_quality">Service quality</option><option value="no_show">No show</option><option value="payment">Payment</option><option value="behaviour">Behaviour</option><option value="other">Other</option></select></label>
      <label>What happened?<input value={description} onChange={(e) => setDescription(e.target.value)} required minLength={10} /></label>
      {err && <p className="error" role="alert">{err}</p>}
      <div className="row"><button className="btn">Send complaint</button><button type="button" className="btn ghost" onClick={() => setOpen(false)}>Close</button></div>
    </form>
  );
}

function BookingCard({ b, role, reload }) {
  const [otp, setOtp] = useState('');       // customer: the generated OTP shown on screen
  const [entry, setEntry] = useState('');   // professional: OTP typed in
  const [msg, setMsg] = useState({ t: '', ok: false });
  const [professionalPhoto, setProfessionalPhoto] = useState('');
  const [photoLoading, setPhotoLoading] = useState(false);
  const kind = STEP[b.status];
  const act = async (fn, okText) => {
    setMsg({ t: '', ok: false });
    try { const r = await fn(); await reload(); if (okText) setMsg({ t: okText, ok: true }); return r; }
    catch (e) { setMsg({ t: errorText(e), ok: false }); }
  };
  const generate = async () => {
    const r = await act(() => api.post(`/otp/${b._id}/${kind}/generate`));
    if (r) setOtp(r.data.data.otp);
  };
  async function pay() {
    const r = await act(() => api.post('/payments/order', { bookingId: b._id }));
    if (!r) return;
    const o = r.data.data;
    try { await loadRazorpay(); } catch (e) { return setMsg({ t: e.message, ok: false }); }
    const rz = new window.Razorpay({
      key: o.keyId, amount: o.amount, currency: o.currency, order_id: o.orderId, name: 'ServiceBridge', description: `${b.requestId?.category} service`,
      handler: (resp) => act(() => api.post('/payments/verify', resp), 'Payment successful'),
    });
    rz.on('payment.failed', (f) => setMsg({ t: `Payment failed: ${f.error?.description || 'try again'}`, ok: false }));
    rz.open();
  }
  async function refund() {
    const reason = window.prompt('Why are you requesting a refund?');
    if (!reason) return;
    try {
      const mine = (await api.get('/payments/mine')).data.data.items.find((p) => p.bookingId === b._id && p.status === 'PAID');
      if (!mine) return setMsg({ t: 'No paid payment found', ok: false });
      await api.post(`/payments/${mine._id}/refund-request`, { reason });
      setMsg({ t: 'Refund requested. An admin will review it.', ok: true });
    } catch (e) { setMsg({ t: errorText(e), ok: false }); }
  }
  const cancel = async () => {
    const reason = window.prompt('Reason for cancelling (optional)');
    if (reason !== null) act(() => api.post(`/bookings/${b._id}/cancel`, { reason }));
  };
  async function showProfessionalPhoto() {
    setPhotoLoading(true);
    setMsg({ t: '', ok: false });
    try {
      const r = await api.get(`/bookings/${b._id}/professional-photo`);
      setProfessionalPhoto(r.data.data.photoData);
    } catch (e) { setMsg({ t: errorText(e), ok: false }); }
    finally { setPhotoLoading(false); }
  }

  return (
    <div className="card">
      <strong>{b.requestId?.category}</strong> <span className={`badge ${b.status === 'CANCELLED' ? 'rejected' : b.status === 'COMPLETED' ? '' : 'pending'}`}>{b.status.replace('_', ' ')}</span>
      <span>{b.requestId?.description}</span>
      <span>₹{b.amountPaise / 100} · {b.requestId?.preferredDate} {b.requestId?.preferredTime}</span>
      {role === 'customer' ? <small>Professional: {b.professionalId?.userId?.name}</small> : <small>Customer: {b.customerId?.name} · {b.requestId?.address}</small>}

      {role === 'customer' && ['CONFIRMED', 'IN_PROGRESS', 'COMPLETION_PENDING'].includes(b.status) && <>
        <button className="btn ghost" disabled={photoLoading} onClick={showProfessionalPhoto}>{photoLoading ? 'Loading photo…' : 'Check who arrives'}</button>
        {professionalPhoto && <img src={professionalPhoto} alt={`Camera photo of ${b.professionalId?.userId?.name || 'your professional'}`} style={{ width: 180, maxWidth: '100%', borderRadius: 10 }} />}
      </>}
      {role === 'customer' && b.status === 'CONFIRMED' && <small>When the professional arrives, check that it is the person you booked, then share the arrival OTP.</small>}
      {role === 'customer' && kind && <button className="btn" onClick={generate}>{kind === 'arrival' ? 'Get arrival OTP' : 'Work is done: get completion OTP'}</button>}
      {role === 'customer' && otp && <div><span style={{ fontSize: 28, fontWeight: 700, letterSpacing: 6 }}>{otp}</span><br /><small>Valid for 10 minutes. Mock delivery: shown here because no SMS provider is connected yet. Share it only with the professional at your door.</small></div>}
      {role === 'customer' && b.status === 'IN_PROGRESS' && <small>Work in progress.</small>}

      {role === 'professional' && kind && (
        <form onSubmit={(e) => { e.preventDefault(); act(() => api.post(`/otp/${b._id}/${kind}/verify`, { otp: entry }), kind === 'arrival' ? 'Verified. Work started.' : 'Job completed.').then(() => setEntry('')); }} style={{ display: 'grid', gap: 8 }}>
          <label>{kind === 'arrival' ? 'Arrival OTP from customer' : 'Completion OTP from customer'}<input inputMode="numeric" maxLength={6} value={entry} onChange={(e) => setEntry(e.target.value)} required /></label>
          <button className="btn">{kind === 'arrival' ? 'Verify and start work' : 'Verify and complete job'}</button>
        </form>
      )}
      {role === 'professional' && b.status === 'IN_PROGRESS' && <button className="btn" onClick={() => act(() => api.post(`/bookings/${b._id}/ready`))}>Mark work finished</button>}
      {role === 'professional' && b.status === 'COMPLETION_PENDING' && <small>Ask the customer to confirm the work and read out the completion OTP.</small>}

      {b.status === 'COMPLETED' && <span className={`badge ${b.paymentStatus === 'UNPAID' ? 'pending' : ''}`}>Payment: {b.paymentStatus}</span>}
      {role === 'customer' && b.status === 'COMPLETED' && b.paymentStatus === 'UNPAID' && <button className="btn" onClick={pay}>Pay ₹{b.amountPaise / 100}</button>}
      {role === 'customer' && b.status === 'COMPLETED' && b.paymentStatus === 'PAID' && <button className="btn ghost" onClick={refund}>Request refund</button>}
      {role === 'customer' && b.status === 'COMPLETED' && !b.reviewed && <ReviewBox b={b} reload={reload} />}
      {role === 'customer' && b.reviewed && <span className="badge">Reviewed</span>}
      {b.status !== 'CANCELLED' && (b.complaintStatus ? <small>Your complaint: {b.complaintStatus.replace('_', ' ').toLowerCase()}</small> : <ComplaintBox b={b} reload={reload} />)}
      {b.status === 'CONFIRMED' && <button className="btn ghost" onClick={cancel}>Cancel booking</button>}
      {msg.t && <p className={msg.ok ? 'ok' : 'error'} role="alert">{msg.t}</p>}
    </div>
  );
}

export default function Bookings() {
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [msg, setMsg] = useState('');
  const load = () => api.get('/bookings/mine').then((r) => setItems(r.data.data.items)).catch((e) => setMsg(errorText(e)));
  useEffect(() => { load(); }, []);
  return (
    <main className="wrap">
      <h1>Bookings</h1>
      {msg && <p className="error" role="alert">{msg}</p>}
      {items?.length === 0 && <p>No bookings yet.</p>}
      <div className="grid">{items?.map((b) => <BookingCard key={b._id} b={b} role={user.role} reload={load} />)}</div>
    </main>
  );
}
