// Service worker for offline use on the Scottish coast (no signal). Strategy:
// - pages: network first, cached copy when offline. Serving a cached page first
//   broke the app after every release: the old page asks for the old build's
//   hashed scripts, and the deploy has already deleted them.
// - hashed build files (/_expo/static/): cache first, they never change.
// - everything else: stale-while-revalidate.
// After one online visit the whole app works offline. Base-path agnostic
// (derives the scope from registration).

const CACHE = 'scottide-v3';

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
      const offline = () => new Response('Offline', { status: 503, statusText: 'Offline' });
      const fromNetwork = () =>
        fetch(req)
          .then((res) => {
            if (res?.ok && res.type === 'basic') {
              cache.put(req, res.clone());
            }
            return res;
          })
          .catch(() => null);

      if (req.mode === 'navigate') {
        const res = await fromNetwork();
        if (res?.ok) {
          return res;
        }
        const scope = self.registration.scope;
        const cached =
          (await cache.match(req)) ||
          (await cache.match(scope)) ||
          (await cache.match(`${scope}index.html`));
        return cached || res || offline();
      }

      const cached = await cache.match(req);
      if (cached) {
        if (!url.pathname.includes('/_expo/static/')) {
          // Keep the worker alive for the background revalidate, or the browser
          // can kill it the moment the cached response is returned and the
          // cache never refreshes.
          event.waitUntil(fromNetwork());
        }
        return cached;
      }
      return (await fromNetwork()) || offline();
    })(),
  );
});
