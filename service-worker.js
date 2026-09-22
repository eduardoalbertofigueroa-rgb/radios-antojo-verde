// Service Worker de Junín Conecta
// Cachea la interfaz de la app (HTML, manifest, ícono) para que cargue
// instantáneo y funcione offline. Los streams de radio en vivo y los
// datos de comercios (Supabase) NUNCA se cachean acá: siempre van a la red.

const CACHE_NAME = 'junin-conecta-v4';

// Archivos base de la interfaz. Agregá acá cada logo de radio (logo/*.webp)
// si querés que las tarjetas se vean completas también sin conexión.
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icono.webp'
];

// Instalación: guarda los archivos base en caché
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activación: borra cachés viejas de versiones anteriores
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: estrategia "cache primero, red como respaldo"
// Pero nunca cachea streams de audio ni llamadas a Supabase (siempre en vivo)
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  const esStreamOApi = url.includes('supabase.co') ||
                        url.includes('stream') ||
                        url.includes('.mp3') ||
                        url.includes('.aac') ||
                        url.includes('.m3u8');

  if (esStreamOApi) {
    // Siempre a la red, nunca cachear contenido en vivo
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).catch(() => {
        // Si no hay red y no está en caché, no rompemos nada más
        return cached;
      });
    })
  );
});
