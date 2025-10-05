// Define un nombre y versión para la caché de nuestra PWA
const CACHE_NAME = 'dl-cumanayagua-cache-v1.1';

// Lista de archivos y recursos que queremos guardar en la caché para que la app funcione offline
const urlsToCache = [
  './portal-cliente-usd.html',
  './manifest.json',
  './img/Logo-DL-Cumanayagua.png',
  // URLs de CDNs (Bootstrap, Google Fonts, etc.)
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  // Opcional: una imagen de placeholder para cuando algo falle
  'https://via.placeholder.com/350x220/E74C3C/FFF?text=Offline'
];

// Evento 'install': Se dispara cuando el Service Worker se instala por primera vez.
// Aquí es donde guardamos nuestros archivos en la caché.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierta. Guardando archivos...');
        // Agrega todos los archivos de la lista a la caché.
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Falló el cacheo inicial de archivos:', err);
      })
  );
});

// Evento 'activate': Se dispara cuando un nuevo Service Worker se activa.
// Aquí limpiamos las cachés viejas para mantener todo actualizado.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Borrando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Evento 'fetch': Se dispara cada vez que la página pide un recurso (una imagen, un CSS, etc.).
// Aquí interceptamos la petición y decidimos si la servimos desde la caché o desde la red.
self.addEventListener('fetch', event => {
  event.respondWith(
    // 1. Intenta buscar el recurso en la caché primero.
    caches.match(event.request)
      .then(response => {
        // Si encontramos el recurso en la caché, lo devolvemos.
        if (response) {
          return response;
        }
        // Si no está en la caché, lo pedimos a la red.
        return fetch(event.request).then(
          networkResponse => {
            // Si la petición a la red fue exitosa, la clonamos y la guardamos en la caché para la próxima vez.
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return networkResponse;
          }
        );
      })
      .catch(() => {
        // Si todo falla (no está en caché y no hay conexión),
        // podrías devolver una página de "offline" predeterminada.
        // Por ahora, simplemente dejamos que el navegador muestre el error.
        console.log('Petición fallida. El usuario podría estar offline.');
      })
  );
});
