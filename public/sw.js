const CACHE_NAME = 'studysnap-cache-v2';

// Static resources to pre-cache immediately on load
const PRECACHE_URLS = [
  '/',
  '/index.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Only handle same-origin http(s) requests
  if (url.origin !== self.location.origin) return;

  // Strictly skip Vite dev endpoints, Firestore APIs, Auth endpoints, and dynamic API routes
  if (
    url.pathname.startsWith('/@vite') ||
    url.pathname.startsWith('/@react-refresh') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.startsWith('/__/auth') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // Navigation requests (Network-First with cached shell fallback)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/', responseClone)).catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          const cached = (await caches.match('/')) || (await caches.match('/index.html'));
          return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
        })
    );
    return;
  }

  // Static build assets (Network-First so fresh deployments never load mismatched chunks -> no white screen)
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone)).catch(() => {});
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        return cachedResponse || new Response('', { status: 503, statusText: 'Unavailable' });
      })
  );
});
