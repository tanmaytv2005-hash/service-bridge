import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext.jsx';
import { api, errorText } from '../api.js';

function decodeApplicationServerKey(value) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export default function PushNotificationSettings() {
  const { user } = useAuth();
  const [supported, setSupported] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user || !['customer', 'professional'].includes(user.role)) return;
      const isAppleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      const isInstalled = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
      const browserSupportsPush = window.isSecureContext
        && 'serviceWorker' in navigator
        && 'PushManager' in window
        && 'Notification' in window
        && (!isAppleMobile || isInstalled);
      if (!active) return;
      setSupported(browserSupportsPush);
      if (!browserSupportsPush) return;
      try {
        const [configResponse, registration] = await Promise.all([
          api.get('/notifications/push/config'),
          navigator.serviceWorker.ready,
        ]);
        if (!active) return;
        setConfigured(configResponse.data.data.configured);
        setSubscribed(Boolean(await registration.pushManager.getSubscription()));
      } catch (error) {
        if (active) setMessage(errorText(error));
      }
    };
    load();
    return () => { active = false; };
  }, [user]);

  if (!user || !['customer', 'professional'].includes(user.role)) return null;

  const enable = async () => {
    setBusy(true);
    setMessage('');
    try {
      const permission = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();
      if (permission !== 'granted') {
        setMessage(permission === 'denied'
          ? 'Notifications are blocked by your browser. Allow them in this site’s browser settings, then try again.'
          : 'Allow notifications to receive ServiceBridge phone alerts.');
        return;
      }
      const [configResponse, registration] = await Promise.all([
        api.get('/notifications/push/config'),
        navigator.serviceWorker.ready,
      ]);
      const config = configResponse.data.data;
      if (!config.configured || !config.publicKey) {
        setMessage('Phone notifications need VAPID keys configured on the server first.');
        return;
      }
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeApplicationServerKey(config.publicKey),
        });
      }
      await api.post('/notifications/push/subscription', subscription.toJSON());
      setSubscribed(true);
      setMessage('Phone alerts are enabled on this device.');
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setMessage('');
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await api.delete('/notifications/push/subscription', { data: { endpoint: subscription.endpoint } });
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      setMessage('Phone alerts are off on this device.');
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card push-settings" aria-labelledby="push-settings-title">
      <div>
        <h2 id="push-settings-title">Phone notifications</h2>
        <p>Customers and professionals can get a phone alert when a new ServiceBridge notification arrives.</p>
      </div>
      {!supported ? (
        <small>Phone alerts need a supported browser and a secure HTTPS address. On iPhone, add ServiceBridge to the Home Screen first.</small>
      ) : !configured ? (
        <small>Phone alerts are not configured on the server yet. In-app notifications will continue to work.</small>
      ) : (
        <button className="btn ghost" type="button" disabled={busy} onClick={subscribed ? disable : enable}>
          {busy ? 'Please wait…' : subscribed ? 'Turn off phone alerts' : 'Enable phone alerts'}
        </button>
      )}
      {message && <small role="status">{message}</small>}
    </section>
  );
}
