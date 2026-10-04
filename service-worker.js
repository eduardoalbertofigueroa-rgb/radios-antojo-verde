// Service Worker de Junín Conecta
// Cachea la interfaz de la app (HTML, manifest, ícono) para que funcione offline.
// Los streams de radio en vivo y los datos de comercios (Supabase) NUNCA se
// cachean acá: siempre van a la red.

// Subí este número cada vez que cambies archivos que no sean el index.html
// (el index.html se actualiza solo, ver más abajo).
const CACHE_NAME = 'junin-conecta-v7';

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

// Fetch
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // 1) Streams de audio y Supabase: siempre a la red, nunca cachear contenido en vivo
  const esStreamOApi = url.includes('supabase.co') ||
                        url.includes('stream') ||
                        url.includes('.mp3') ||
                        url.includes('.aac') ||
                        url.includes('.m3u8');
  if (esStreamOApi) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 2) La página (index.html) y el manifest: RED PRIMERO.
  //    Si hay internet, siempre se ve la última versión (y se guarda una copia).
  //    Si no hay internet, se usa la copia guardada. Así no hace falta subir
  //    el número de versión cada vez que cambiás el index.html.
  const esPagina = event.request.mode === 'navigate' || url.endsWith('/manifest.json');
  if (esPagina) {
    const clave = event.request.mode === 'navigate' ? './index.html' : event.request;
    event.respondWith(
      fetch(event.request)
        .then((respuesta) => {
          if (respuesta && respuesta.ok) {
            const copia = respuesta.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(clave, copia));
          }
          return respuesta;
        })
        .catch(() => caches.match(clave).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // 3) Todo lo demás (ícono, logos): caché primero, red como respaldo
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).catch(() => Response.error());
    })
  );
});
