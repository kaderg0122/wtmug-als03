const CACHE_NAME = 'weather-cache-v4';
const RUNTIME_CACHE = 'weather-runtime-v4';

const SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

/* ---------- INSTALL ---------- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        SHELL.map((url) =>
          cache.add(url).catch((err) =>
            console.warn('Önbelleklenemedi:', url, err)
          )
        )
      )
    )
  );
  self.skipWaiting();
});

/* ---------- ACTIVATE ---------- */
self.addEventListener('activate', (event) => {
  const keep = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/* ---------- FETCH ---------- */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  const isApi =
    url.hostname.includes('api.open-meteo.com') ||
    url.hostname.includes('geocoding-api.open-meteo.com') ||
    url.hostname.includes('bigdatacloud.net');

  if (isApi) {
    event.respondWith(networkFirst(req));
    return;
  }

  event.respondWith(cacheFirst(req));
});

/* ---------- Stratejiler ---------- */
async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;

  try {
    const res = await fetch(req);
    if (res && res.status === 200 && res.type === 'basic') {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(req, res.clone());
    }
    return res;
  } catch (err) {
    if (req.mode === 'navigate') {
      const shell = await caches.match('./index.html');
      if (shell) return shell;
    }
    return new Response('Çevrimdışı', { status: 503, statusText: 'Offline' });
  }
}

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res && res.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(req, res.clone());
    }
    return res;
  } catch (err) {
    const cached = await caches.match(req);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: 'offline' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}