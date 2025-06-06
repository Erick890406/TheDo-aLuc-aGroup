// Define un nombre y una versión para el caché.
const CACHE_NAME = 'shopping-list-pro-cache-v1';

// Lista de archivos que se guardarán en caché durante la instalación.
const urlsToCache = [
  '/', // Esto cachea el index.html en la raíz
  'index.html',
  'manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  // --- IMPORTANTE: Añade aquí los íconos que creaste ---
  'icon-192.png',
  'icon-512.png',
  'maskable-icon.png'
];

// Evento 'install': Se dispara cuando el Service Worker se instala.
self.addEventListener('install', event => {
  // Espera hasta que el caché esté abierto y todos los archivos se hayan cacheado.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto. Cacheando archivos iniciales...');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento 'fetch': Se dispara cada vez que la aplicación solicita un recurso (una página, un CSS, una imagen, etc.).
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si el recurso se encuentra en el caché, lo devuelve desde allí.
        if (response) {
          return response;
        }
        
        // Si no está en el caché, intenta obtenerlo de la red.
        return fetch(event.request);
      })
  );
});

// Evento 'activate': Se dispara cuando un nuevo Service Worker se activa.
// Aquí es donde se limpian los cachés antiguos para evitar usar archivos desactualizados.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME]; // Lista de cachés que queremos mantener.

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Si el caché no está en nuestra lista blanca, lo borramos.
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Borrando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});