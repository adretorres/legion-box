// ─── service-worker.js ────────────────────────────────────────────────────────
const CACHE_NAME = 'legion-box-v4';

const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/landing.css',
  '/landing.js',
  '/js/firebase.js',
  '/js/auth.js',
  '/js/atletas.js',
  '/js/clases.js',
  '/js/ranking.js',
  '/js/competencia.js',
  '/js/cronometro.js',
  '/js/rm.js',
  '/js/notificaciones.js',
  '/js/horarios.js',
  '/js/main.js',
  '/js/planes.js',
  '/js/motor-pagos.js',
  '/js/pagos-qr.js',
  '/js/ui.js',
  '/icon-192.png',
  '/icon-512.png'
];

// Instalación
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activación — limpiar caches viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — network first, cache fallback
self.addEventListener('fetch', event => {
  // No interceptar Firebase ni Firestore
  if (event.request.url.includes('firebase') ||
      event.request.url.includes('firestore') ||
      event.request.url.includes('googleapis') ||
      event.request.url.includes('gstatic')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});