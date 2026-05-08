// ─── service-worker.js ────────────────────────────────────────────────────────
const CACHE_NAME = 'legion-box-v1';

const ASSETS = [
  '/legion-box/',
  '/legion-box/index.html',
  '/legion-box/style.css',
  '/legion-box/js/firebase.js',
  '/legion-box/js/auth.js',
  '/legion-box/js/atletas.js',
  '/legion-box/js/clases.js',
  '/legion-box/js/ranking.js',
  '/legion-box/js/competencia.js',
  '/legion-box/js/cronometro.js',
  '/legion-box/js/rm.js',
  '/legion-box/js/notificaciones.js',
  '/legion-box/js/horarios.js',
  '/legion-box/js/main.js',
  '/legion-box/js/ui.js',
  '/legion-box/icon-192.png',
  '/legion-box/icon-512.png'
];

// Instalación — cachear assets principales
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
  // No interceptar requests a Firebase
  if (event.request.url.includes('firebase') ||
      event.request.url.includes('firestore') ||
      event.request.url.includes('googleapis')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Guardar copia en cache
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
