// Service worker for offline use on the Scottish coast (no signal). Strategy:
// stale-while-revalidate for same-origin GETs — serve from cache instantly,
// refresh in the background — with a navigation fallback to the cached start
// page. After one online visit the whole app works offline. Base-path agnostic
// (derives the scope from registration).

const CACHE = 'scottide-v2';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') {
    return;
  }
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);

      const network = fetch(req)
        .then((res) => {
          if (res && res.ok && res.type === 'basic') {
            cache.put(req, res.clone());
          }
          return res;
        })
        .catch(() => null);

      if (cached) {
        return cached; // revalidate happens in the background
      }
      const res = await network;
      if (res) {
        return res;
      }
      if (req.mode === 'navigate') {
        const scope = self.registration.scope;
        const fallback = (await cache.match(scope)) || (await cache.match(`${scope}index.html`));
        if (fallback) {
          return fallback;
        }
      }
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    })(),
  );
});
