import { useEffect, useRef, useState } from 'react';
import { socket } from '../socket.js';

// STUN only. Strict networks may also need a TURN server (see notes) for the call to connect.
const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

export default function VideoRoom({ sessionId }) {
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const [status, setStatus] = useState('Starting camera…');

  useEffect(() => {
    let pc; let stream; let stopped = false;
    let chain = Promise.resolve(); // handle signals one at a time, in order

    async function handle(d) {
      if (d.sdp) {
        await pc.setRemoteDescription(d.sdp);
        if (d.sdp.type === 'offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('vv:signal', { sdp: pc.localDescription });
        }
      } else if (d.candidate) {
        await pc.addIceCandidate(d.candidate);
      }
    }
    const onSignal = (d) => { chain = chain.then(() => handle(d)).catch(() => {}); };
    const onReady = async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('vv:signal', { sdp: pc.localDescription });
    };
    const onLeft = () => setStatus('The other person left the call.');

    (async () => {
      if (!socket.connected) socket.connect();
      try { stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); }
      catch { return setStatus('Camera or microphone permission was denied.'); }
      if (stopped) return stream.getTracks().forEach((t) => t.stop());
      localRef.current.srcObject = stream;
      pc = new RTCPeerConnection(ICE);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      pc.ontrack = (e) => { remoteRef.current.srcObject = e.streams[0]; setStatus('Connected'); };
      pc.onicecandidate = (e) => { if (e.candidate) socket.emit('vv:signal', { candidate: e.candidate }); };
      socket.on('vv:signal', onSignal);
      socket.on('vv:ready', onReady);
      socket.on('vv:left', onLeft);
      socket.emit('vv:join', sessionId, (r) => setStatus(r.ok ? 'Waiting for the other person…' : r.message));
    })();

    return () => {
      stopped = true;
      socket.off('vv:signal', onSignal); socket.off('vv:ready', onReady); socket.off('vv:left', onLeft);
      pc?.close();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [sessionId]);

  return (
    <div className="card">
      <strong>{status}</strong>
      <div className="grid">
        <video ref={remoteRef} autoPlay playsInline style={{ width: '100%', borderRadius: 12, background: '#000', minHeight: 160 }} />
        <video ref={localRef} autoPlay playsInline muted style={{ width: '100%', borderRadius: 12, background: '#000', minHeight: 160 }} />
      </div>
      <small>This call is not recorded. A video call helps an admin check you, but it is not legal proof of identity on its own.</small>
    </div>
  );
}
