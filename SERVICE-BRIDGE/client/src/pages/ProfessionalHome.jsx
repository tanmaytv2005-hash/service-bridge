import { useEffect, useRef, useState } from 'react';
import { api, errorText } from '../api.js';
import ProfessionalLocation from './ProfessionalLocation.jsx';
import VideoVerificationCard from './VideoVerificationCard.jsx';
import '../phase2.css';

const LABEL = { pending: 'Pending', under_review: 'Under review', approved: 'Approved', rejected: 'Rejected', suspended: 'Suspended', removed: 'Removed' };
const split = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
const EDITABLE = ['pending', 'rejected'];

function CameraPhoto({ profile, canCapture, onSaved, setMessage }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }
  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);
  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => setMessage({ type: 'error', text: 'Allow camera access, then try again.' }));
    }
  }, [cameraOn]);

  async function openCamera() {
    setMessage({ type: '', text: '' });
    if (!navigator.mediaDevices?.getUserMedia) return setMessage({ type: 'error', text: 'Camera access is unavailable. Open this site on localhost or HTTPS and allow camera access.' });
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      setPreview('');
      setCameraOn(true);
    } catch {
      setMessage({ type: 'error', text: 'Could not open the camera. Check browser camera permission and try again.' });
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video?.videoWidth) return setMessage({ type: 'error', text: 'Wait for the camera preview to appear, then capture again.' });
    const scale = Math.min(1, 480 / video.videoWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL('image/jpeg', 0.62);
    if (data.length > 550000) return setMessage({ type: 'error', text: 'The captured photo is too large. Move closer to a plain background and retake it.' });
    setPreview(data);
    stopCamera();
    setMessage({ type: '', text: '' });
  }

  async function save() {
    if (!preview) return;
    setBusy(true);
    setMessage({ type: '', text: '' });
    try {
      await api.put('/professionals/live-photo', { photoData: preview });
      setPreview('');
      await onSaved();
      setMessage({ type: 'ok', text: 'Camera photo saved.' });
    } catch (e) { setMessage({ type: 'error', text: errorText(e) }); }
    finally { setBusy(false); }
  }

  return (
    <section className="card" style={{ display: 'grid', gap: 12 }}>
      <p>Capture a small photo with your camera. You can preview it and retake it before saving. A camera photo is not a liveness check.</p>
      {profile?.livePhotoData && <div><strong>Saved photo</strong><br /><img src={profile.livePhotoData} alt="Your saved profile photo" style={{ width: 180, maxWidth: '100%', borderRadius: 10, marginTop: 8 }} /></div>}
      {cameraOn && <video ref={videoRef} autoPlay playsInline muted style={{ width: 320, maxWidth: '100%', borderRadius: 10, background: '#111' }} />}
      {preview && <div><strong>Preview</strong><br /><img src={preview} alt="Camera photo preview" style={{ width: 240, maxWidth: '100%', borderRadius: 10, marginTop: 8 }} /></div>}
      {canCapture && <div className="row">
        {!cameraOn && <button type="button" className="btn ghost" onClick={openCamera}>{profile?.livePhotoData ? 'Retake photo' : 'Open camera'}</button>}
        {cameraOn && <><button type="button" className="btn" onClick={capture}>Capture photo</button><button type="button" className="btn ghost" onClick={stopCamera}>Close camera</button></>}
        {preview && <><button type="button" className="btn" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save photo'}</button><button type="button" className="btn ghost" onClick={openCamera}>Retake</button></>}
      </div>}
      {!canCapture && !profile?.livePhotoData && <small>Photo capture is available while preparing your application.</small>}
    </section>
  );
}

export default function ProfessionalHome() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ bio: '', categories: [], skills: '', experienceYears: 0, serviceAreas: '', city: 'Shivamogga' });
  const [doc, setDoc] = useState({ docType: 'identity', documentRef: '', consent: false });
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarConsent, setAadhaarConsent] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [cats, setCats] = useState([]);

  async function load() {
    const d = (await api.get('/professionals/me')).data.data;
    setData(d);
    if (d.profile) {
      const p = d.profile;
      setForm({ bio: p.bio || '', categories: p.categories, skills: p.skills.join(', '), experienceYears: p.experienceYears, serviceAreas: p.serviceAreas.join(', '), city: p.city || 'Shivamogga' });
    }
  }
  useEffect(() => { api.get('/categories').then((r) => setCats(r.data.data.items)); }, []);
  useEffect(() => { load().catch((e) => setMsg({ type: 'error', text: errorText(e) })); }, []);

  async function run(fn, okText) {
    setMsg({ type: '', text: '' });
    try { await fn(); await load(); setMsg({ type: 'ok', text: okText }); }
    catch (e) { setMsg({ type: 'error', text: errorText(e) }); }
  }
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toggle = (c) => setForm({ ...form, categories: form.categories.includes(c) ? form.categories.filter((x) => x !== c) : [...form.categories, c] });

  async function submitAadhaar(e) {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    try {
      await api.put('/professionals/aadhaar', { aadhaarNumber, consent: aadhaarConsent });
      setAadhaarNumber('');
      setAadhaarConsent(false);
      await load();
      setMsg({ type: 'ok', text: 'Aadhaar checksum passed and the check was sent to the admin. The full number was not saved.' });
    } catch (e) { setMsg({ type: 'error', text: errorText(e) }); }
  }

  if (!data) return <p className="center">Loading…</p>;
  const p = data.profile;
  const editable = !p || EDITABLE.includes(p.status);
  const photoEditable = !!p && (editable || (p.addedByAdmin && p.status === 'approved' && !p.livePhotoCapturedAt));

  return (
    <main className="wrap">
      <h1>Professional dashboard</h1>
      <div className="card">
        <p>Application status: <span className={`badge ${p?.status || 'pending'}`}>{p ? LABEL[p.status] || p.status : 'Profile not created'}</span></p>
        {p?.addedByAdmin && <p><strong>Added by admin</strong></p>}
        {p?.status === 'rejected' && <p className="error">Reason: {p.rejectionReason}</p>}
        {p?.status === 'under_review' && <p>An admin is reviewing your details.</p>}
        {p?.status === 'approved' && <p>You are approved and can receive customer requests.</p>}
        {p?.status === 'suspended' && <p className="error">Your account is suspended. Reason: {p.rejectionReason}</p>}
        {p?.status === 'removed' && <p className="error">Your professional account was removed by an admin. Reason: {p.removalReason}</p>}
      </div>
      {msg.text && <p className={msg.type === 'error' ? 'error' : 'ok'} role="alert">{msg.text}</p>}

      <h2>1. Your profile</h2>
      <form className="card" onSubmit={(e) => { e.preventDefault(); run(() => api.put('/professionals/profile', { ...form, skills: split(form.skills), serviceAreas: split(form.serviceAreas), experienceYears: Number(form.experienceYears) }), 'Profile saved'); }}>
        <fieldset disabled={!editable} style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 12 }}>
          <div className="checks">{cats.map((c) => <label key={c.slug}><input type="checkbox" checked={form.categories.includes(c.slug)} onChange={() => toggle(c.slug)} />{c.name}</label>)}</div>
          <label>About you<input value={form.bio} onChange={set('bio')} maxLength={500} /></label>
          <label>Skills (comma separated)<input value={form.skills} onChange={set('skills')} /></label>
          <label>Years of experience<input type="number" min="0" max="60" value={form.experienceYears} onChange={set('experienceYears')} /></label>
          <label>Service areas (comma separated)<input value={form.serviceAreas} onChange={set('serviceAreas')} /></label>
          <label>City<select value={form.city} onChange={set('city')}><option>Shivamogga</option><option>Bengaluru</option></select></label>
          <button className="btn">Save profile</button>
        </fieldset>
      </form>

      {p && <>
        <h2>2. Aadhaar check</h2>
        <div className="card">
          <p>For this demo, use a dummy 12-digit number only. The server checks its format and checksum, then keeps only the last four digits and a one-way fingerprint. This is not government identity verification.</p>
          <p>Status: <span className={`badge ${p.aadhaarStatus === 'approved' ? '' : p.aadhaarStatus === 'rejected' ? 'rejected' : 'pending'}`}>{(p.aadhaarStatus || 'not_submitted').replace('_', ' ')}</span>{p.aadhaarLast4 && <> · Last four digits: <strong>•••• {p.aadhaarLast4}</strong></>} · Checksum: {p.aadhaarLast4 ? (p.aadhaarChecksumValid ? 'valid' : 'invalid') : 'not checked'}</p>
          {p.aadhaarReviewNote && <p>Admin note: {p.aadhaarReviewNote}</p>}
          {editable && p.aadhaarStatus !== 'approved' && <form onSubmit={submitAadhaar} style={{ display: 'grid', gap: 10 }}>
            <label>12-digit demo Aadhaar number<input type="password" inputMode="numeric" autoComplete="off" maxLength={12} pattern="[0-9]{12}" value={aadhaarNumber} onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, '').slice(0, 12))} required /></label>
            <label className="checks"><input type="checkbox" checked={aadhaarConsent} onChange={(e) => setAadhaarConsent(e.target.checked)} required />I consent to the format/checksum check and duplicate detection for this demo.</label>
            <button className="btn ghost" disabled={aadhaarNumber.length !== 12 || !aadhaarConsent}>Send Aadhaar check for admin review</button>
          </form>}
        </div>

        <h2>3. Live photo</h2>
        <CameraPhoto profile={p} canCapture={photoEditable} onSaved={load} setMessage={setMsg} />
        {p.status === 'under_review' && <VideoVerificationCard />}
        {editable && (
          <>
            <h2>4. Submit for review</h2>
            <p>The admin can approve only after the Aadhaar check, camera photo, and passed video verification are complete.</p>
            <button className="btn" disabled={!p.aadhaarLast4 || !p.aadhaarChecksumValid || !p.livePhotoCapturedAt} onClick={() => run(() => api.post('/professionals/submit'), 'Submitted for review')}>Submit for verification</button>
          </>
        )}

        <h2>5. Other verification documents (optional)</h2>
        <div className="card">
          <p>Do not enter real ID numbers here. Use demo references only.</p>
          <ul>{data.documents.map((d) => <li key={d._id}>{d.docType}: {d.documentRef}</li>)}</ul>
          {editable && (
            <form onSubmit={(e) => { e.preventDefault(); run(() => api.post('/professionals/documents', doc), 'Document added'); }} style={{ display: 'grid', gap: 12 }}>
              <label>Type<select value={doc.docType} onChange={(e) => setDoc({ ...doc, docType: e.target.value })}><option value="identity">Identity</option><option value="address">Address</option><option value="skill_certificate">Skill certificate</option></select></label>
              <label>Demo reference<input value={doc.documentRef} onChange={(e) => setDoc({ ...doc, documentRef: e.target.value })} /></label>
              <label className="checks"><input type="checkbox" checked={doc.consent} onChange={(e) => setDoc({ ...doc, consent: e.target.checked })} />I consent to ServiceBridge using this only for verification.</label>
              <button className="btn ghost">Add document</button>
            </form>
          )}
        </div>
      </>}
      {p && <ProfessionalLocation profile={p} onChange={load} />}
    </main>
  );
}
