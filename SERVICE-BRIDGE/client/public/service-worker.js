self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: 'Open ServiceBridge to see your latest update.' };
  }
  const url = typeof data.url === 'string' && data.url.startsWith('/') && !data.url.startsWith('//')
    ? data.url
    : '/notifications';
  event.waitUntil(self.registration.showNotification(data.title || 'ServiceBridge', {
    body: data.body || 'You have a new notification. Open ServiceBridge to view it.',
    icon: '/servicebridge.svg',
    badge: '/servicebridge.svg',
    data: { url },
    tag: `servicebridge-${data.id || Date.now()}`,
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = event.notification.data?.url;
  const url = new URL(typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') ? path : '/notifications', self.location.origin);
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windows) => {
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) {
      await existing.navigate(url.href);
      return existing.focus();
    }
    return self.clients.openWindow(url.href);
  }));
});
