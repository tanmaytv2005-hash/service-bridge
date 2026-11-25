import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/me').then((r) => setUser(r.data.data.user)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  const login = async (body) => { const r = await api.post('/auth/login', body); setUser(r.data.data.user); return r.data.data.user; };
  const register = async (body) => { const r = await api.post('/auth/register', body); setUser(r.data.data.user); return r.data.data.user; };
  const logout = async () => {
    // Detach this device before another person signs in on the same phone/browser.
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration('/');
        const subscription = await registration?.pushManager?.getSubscription();
        if (subscription) {
          try { await api.delete('/notifications/push/subscription', { data: { endpoint: subscription.endpoint } }); }
          finally { await subscription.unsubscribe(); }
        }
      }
    } catch {
      // Logout must still work if push settings or connectivity are unavailable.
    }
    await api.post('/auth/logout');
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}
