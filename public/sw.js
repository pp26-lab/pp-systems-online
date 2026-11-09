// PP Systems service worker: ONLY shows chat notifications (Web Push) while the site is closed,
// the screen is off or another app is open. It deliberately caches nothing and does not touch
// fetch(), so it can never serve an old version of the site.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data && event.data.text() }; }
  const title = data.title || 'PP Systems';
  event.waitUntil((async () => {
    // The shop is looking at PP Systems right now: the page plays its own sound, so don't ring
    // twice. Not on Apple devices, which cancel the subscription if a push shows nothing.
    const apple = /iPhone|iPad|iPod|Macintosh/.test(self.navigator.userAgent || '');
    if (!apple) {
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (wins.some(w => w.visibilityState === 'visible' && w.focused)) return;
    }
    await self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/brand/pp-systems-icon-192.png',
      tag: data.tag || 'pp-chat',
      renotify: true,          // ring again for a new message in the same chat
      vibrate: [200, 100, 200],
      data: { url: data.url || '/chat' },
    });
  })());
});

// Tapping the notification opens that chat: reuse an open PP Systems tab if there is one.
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/chat', self.location.origin).href;
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (new URL(c.url).origin === self.location.origin) {
        await c.focus();
        if ('navigate' in c) return c.navigate(url);
        return;
      }
    }
    return self.clients.openWindow(url);
  })());
});
