const CACHE_NAME = 'gestor-productos-cache-v1';
const urlsToCache = [
  '.', // Esto cacheará el index.html en la raíz
  'index.html', // Alias explícito si lo prefieres
  // Puedes añadir aquí rutas a CSS, JS externos o imágenes importantes
  // Como tu CSS y JS están inline en el HTML, '.' o 'index.html' es lo principal
  // Si tuvieras iconos referenciados directamente en CSS/HTML (no solo en manifest):
  // 'icons/icon-192x192.png',
  // 'icons/icon-512x512.png'
  // Pero para esta app simple, el manifest se encarga de los iconos de la app.
];

// Instalación del Service Worker: se cachean los assets principales
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting(); // Fuerza al SW a activarse inmediatamente
});

// Activación del Service Worker: se limpian caches antiguas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Toma control inmediato de las páginas
});

// Interceptación de peticiones fetch: servir desde cache si está disponible
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        // Si no está en caché, ir a la red
        return fetch(event.request).then(
          networkResponse => {
            // Si la respuesta es válida, clonarla y guardarla en caché
            if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return networkResponse;
          }
        ).catch(error => {
          // Manejo de error de red (p.ej., offline)
          // Podrías devolver una página offline genérica aquí si la tuvieras
          console.error('Fetching failed:', error);
          // throw error; // Opcional, o devolver una respuesta de fallback
        });
      })
  );
});