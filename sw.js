const CACHE_NAME = 'kask-web-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/khata.html',
  '/track.html',
  '/approval.html',
  '/css/app.css',
  '/js/config.js',
  '/js/api.js',
  '/js/catalog.js',
  '/js/cart.js',
  '/js/khata.js',
  '/data/products_seed.json',
  '/data/customers_seed.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      return cached || fetch(e.request).catch(() => caches.match('/index.html'));
    })
  );
});
