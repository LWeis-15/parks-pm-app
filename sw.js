// Offline-first app shell cache. No signal in parts of the park is a hard
// requirement (see README "Field Constraints") — this is what makes the app
// itself, not just its data, load with zero connectivity.
const CACHE = 'parks-pm-shell-v1';

const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/tokens.css',
  './css/app.css',
  './js/app.js',
  './js/router.js',
  './js/store.js',
  './js/db.js',
  './js/seed.js',
  './js/calc.js',
  './js/icons.js',
  './js/components/ui.js',
  './js/components/photos.js',
  './js/components/toast.js',
  './js/components/signature.js',
  './js/screens/today.js',
  './js/screens/mywork.js',
  './js/screens/rom.js',
  './js/screens/assets-list.js',
  './js/screens/asset-record.js',
  './js/screens/issues.js',
  './js/screens/program.js',
  './js/screens/queue.js',
  './js/screens/closeout.js',
  './js/screens/closeout-failed.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-32.png',
  './icons/icon-180.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res && res.ok) caches.open(CACHE).then((cache) => cache.put(req, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
