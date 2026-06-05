/**
 * MasterMind Service Worker v3
 * Cache-First for static, Network-First for pages, offline fallback
 */
const CACHE_VERSION = 'mm-v3';
const STATIC_CACHE  = CACHE_VERSION + '-static';
const PAGE_CACHE    = CACHE_VERSION + '-pages';
const IMAGE_CACHE   = CACHE_VERSION + '-images';

const PRECACHE_PAGES = ['/', '/login', '/offline', '/app', '/app/aufgaben', '/app/karteikarten', '/app/uebungen', '/app/noten'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(PAGE_CACHE).then((c) =>
      Promise.all(PRECACHE_PAGES.map((url) =>
        fetch(url, { credentials: 'same-origin' })
          .then((r) => { if (r.ok) c.put(url, r); })
          .catch(() => {})
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith('mm-') && !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || request.method !== 'GET') return;

  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(caches.open(STATIC_CACHE).then(async (c) => {
      const hit = await c.match(request);
      if (hit) return hit;
      const res = await fetch(request);
      if (res.ok) c.put(request, res.clone());
      return res;
    }));
    return;
  }

  e.respondWith(
    fetch(request, { credentials: 'same-origin' })
      .then((res) => {
        if (res.ok) caches.open(PAGE_CACHE).then((c) => c.put(request, res.clone()));
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.headers.get('accept')?.includes('text/html')) return caches.match('/offline') ?? new Response('Offline', { status: 503 });
        return new Response('', { status: 503 });
      })
  );
});

self.addEventListener('push', (e) => {
  if (!e.data) return;
  let p; try { p = e.data.json(); } catch { p = { title: 'MasterMind', body: e.data.text() }; }
  e.waitUntil(self.registration.showNotification(p.title ?? 'MasterMind', { body: p.body ?? '', icon: '/icon', badge: '/icon', data: p.data ?? {}, vibrate: [100, 50, 100] }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url ?? '/app';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const ex = clients.find((c) => c.url.includes(self.location.origin));
    if (ex) { ex.focus(); ex.postMessage({ type: 'NOTIFICATION_CLICK', url }); }
    else self.clients.openWindow(url);
  }));
});
