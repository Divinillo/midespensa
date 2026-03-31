const CACHE = 'midespensa-v8';
// success.html excluded: it's only visited once post-payment and must always be fresh
const PRECACHE = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];

// Instalación: cachear solo archivos propios
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

// Activación: limpiar caches antiguos y tomar control inmediatamente
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: CDN siempre de red, archivos propios cache-first
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Nunca interceptar recursos externos (CDN, Stripe, Supabase, etc.)
  if (!url.startsWith(self.location.origin)) {
    return; // dejar pasar sin interceptar
  }

  // Solo cachear peticiones GET (la Cache API no soporta POST)
  if (e.request.method !== 'GET') return;

  // Archivos propios: cache-first con fallback a red
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(response => {
        if (response && response.status === 200 && e.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      });
    }).catch(() => caches.match('./index.html'))
  );
});
