import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorText } from '../api.js';
import '../phase2.css';

const STATUSES = ['under_review', 'pending', 'approved', 'rejected', 'suspended', 'removed'];
const ACTIVE_BOOKINGS_NOTE = 'Removal is blocked while the professional has active bookings.';

export default function AdminHome() {
  const [status, setStatus] = useState('under_review');
  const [items, setItems] = useState([]);
  const [sel, setSel] = useState(null);
  const [reason, setReason] = useState('');
  const [aadhaarNote, setAadhaarNote] = useState('');
  const [removeReason, setRemoveReason] = useState('');
  const [msg, setMsg] = useState('');

  const loadList = () => api.get('/admin/professionals', { params: { status } }).then((r) => setItems(r.data.data.items)).catch((e) => setMsg(errorText(e)));
  useEffect(() => { setSel(null); loadList(); }, [status]);

  const open = async (id) => {
    try { setSel((await api.get(`/admin/professionals/${id}`)).data.data); setReason(''); setAadhaarNote(''); setRemoveReason(''); setMsg(''); }
    catch (e) { setMsg(errorText(e)); }
  };
  async function decide(decision) {
    setMsg('');
    try { await api.patch(`/admin/professionals/${sel.profile._id}/decision`, { decision, reason }); await open(sel.profile._id); await loadList(); setMsg(`Done: ${decision}`); }
    catch (e) { setMsg(errorText(e)); }
  }
  async function reviewAadhaar(decision) {
    setMsg('');
    try { await api.patch(`/admin/professionals/${sel.profile._id}/aadhaar`, { decision, note: aadhaarNote }); await open(sel.profile._id); await loadList(); setMsg(`Aadhaar check ${decision === 'approve' ? 'approved' : 'rejected'}.`); }
    catch (e) { setMsg(errorText(e)); }
  }
  async function remove() {
    if (!sel || !window.confirm(`Remove ${sel.profile.userId?.name} from ServiceBridge?`)) return;
    setMsg('');
    try { const r = await api.delete(`/admin/professionals/${sel.profile._id}`, { data: { reason: removeReason } }); await open(sel.profile._id); await loadList(); setMsg(`Professional removed. ${r.data.data.rejectedQuotationCount} open quotation(s) rejected.`); }
    catch (e) { setMsg(errorText(e)); }
  }

  return (
    <main className="wrap">
      <h1>Admin: professional management</h1>
      <nav style={{ marginBottom: 16, lineHeight: 2 }}>
        <Link to="/admin/professionals/new">Add professional</Link> · <Link to="/admin/categories">Service categories</Link> · <Link to="/admin/payments">Payments and payouts</Link> · <Link to="/admin/video">Video verification</Link> · <Link to="/admin/complaints">Complaints</Link> · <Link to="/admin/analytics">Analytics</Link>
      </nav>
      <label style={{ maxWidth: 240 }}>Show<select value={status} onChange={(e) => setStatus(e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select></label>
      {msg && <p className={msg.startsWith('Done') || msg.startsWith('Aadhaar check') || msg.startsWith('Professional removed') ? 'ok' : 'error'} role="alert">{msg}</p>}
      <div className="split" style={{ marginTop: 16 }}>
        <div style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
          {items.length === 0 && <p>No professionals with this status.</p>}
          {items.map((i) => <button key={i._id} className={`item ${sel?.profile._id === i._id ? 'on' : ''}`} onClick={() => open(i._id)}><strong>{i.userId?.name}</strong>{i.addedByAdmin && <small> · Added by admin</small>}<br /><small>{i.categories.join(', ')} · {i.city}</small></button>)}
        </div>
        <div className="card">
          {!sel ? <p>Select a professional to review.</p> : (
            <>
              <h2 style={{ margin: 0 }}>{sel.profile.userId?.name} <span className={`badge ${sel.profile.status}`}>{sel.profile.status.replace('_', ' ')}</span></h2>
              {sel.profile.addedByAdmin && <p><strong>Added by admin</strong></p>}
              <p>{sel.profile.userId?.email} · {sel.profile.userId?.phone}</p>
              <p><strong>Categories:</strong> {sel.profile.categories.join(', ')}<br /><strong>Skills:</strong> {sel.profile.skills.join(', ') || '-'}<br /><strong>Experience:</strong> {sel.profile.experienceYears} years<br /><strong>Areas:</strong> {sel.profile.serviceAreas.join(', ') || '-'}<br /><strong>About:</strong> {sel.profile.bio || '-'}</p>
              <section className="card" style={{ margin: '12px 0' }}>
                <strong>Aadhaar check</strong>
                <p>Status: {sel.profile.aadhaarStatus || 'not submitted'} · Last four digits: {sel.profile.aadhaarLast4 ? `•••• ${sel.profile.aadhaarLast4}` : 'not provided'} · Checksum: {sel.profile.aadhaarLast4 ? (sel.profile.aadhaarChecksumValid ? 'valid' : 'invalid') : 'not checked'}</p>
                {sel.profile.aadhaarReviewNote && <p>Previous admin note: {sel.profile.aadhaarReviewNote}</p>}
                {sel.profile.aadhaarStatus === 'pending' && <>
                  <label>Review note (required)<input value={aadhaarNote} onChange={(e) => setAadhaarNote(e.target.value)} minLength={3} maxLength={300} /></label>
                  <div className="row"><button className="btn" disabled={aadhaarNote.trim().length < 3} onClick={() => reviewAadhaar('approve')}>Approve Aadhaar check</button><button className="btn ghost" disabled={aadhaarNote.trim().length < 3} onClick={() => reviewAadhaar('reject')}>Reject Aadhaar check</button></div>
                </>}
              </section>
              <p><strong>Live photo:</strong></p>
              {sel.profile.livePhotoData ? <img src={sel.profile.livePhotoData} alt={`Live photo of ${sel.profile.userId?.name}`} style={{ width: 220, maxWidth: '100%', borderRadius: 10 }} /> : <p>No live photo captured.</p>}
              <p><strong>Other documents:</strong></p>
              <ul>{sel.documents.map((d) => <li key={d._id}>{d.docType}: {d.documentRef}</li>)}</ul>

              {(sel.profile.status === 'under_review' || sel.profile.status === 'suspended') && <>
                <label>Reason (required for reject or suspend)<input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} /></label>
                <div className="row">
                  <button className="btn" onClick={() => decide('approve')}>Approve application</button>
                  {sel.profile.status === 'under_review' && <button className="btn ghost" disabled={reason.trim().length < 3} onClick={() => decide('reject')}>Reject application</button>}
                  {sel.profile.status === 'under_review' && <button className="btn ghost" disabled={reason.trim().length < 3} onClick={() => decide('suspend')}>Suspend</button>}
                </div>
                <small>Application approval also requires an approved Aadhaar check, a saved photo, and a passed Phase 7 video check. Review the video check on the Video verification page.</small>
              </>}

              {sel.profile.status !== 'removed' && <section className="card" style={{ marginTop: 16 }}>
                <strong>Remove professional</strong>
                <p>{ACTIVE_BOOKINGS_NOTE} The account and payment history will remain available for audit.</p>
                <label>Removal reason<input value={removeReason} onChange={(e) => setRemoveReason(e.target.value)} minLength={3} maxLength={300} /></label>
                <button className="btn ghost" disabled={removeReason.trim().length < 3} onClick={remove}>Remove professional</button>
              </section>}
              {sel.profile.removalReason && <p><strong>Removal reason:</strong> {sel.profile.removalReason}</p>}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
