// sw.js

const CACHE_NAME = 'dl-cumanayagua-cache-v1';
const urlsToCache = [
  // Deberías listar aquí los archivos principales de tu PWA
  // para que funcionen offline.
  // Por ahora, lo dejaremos simple para la instalación.
  // Ejemplo:
  // '/',
  // '/portal-cliente-usd.html', // O la ruta correcta
  // 'styles.css', // Si tuvieras un CSS separado
  // 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css',
  // ...otros assets importantes
];

self.addEventListener('install', event => {
  console.log('Service Worker: Instalado');
  // event.waitUntil(
  //   caches.open(CACHE_NAME)
  //     .then(cache => {
  //       console.log('Service Worker: Cacheando archivos');
  //       return cache.addAll(urlsToCache);
  //     })
  //     .catch(err => console.error('Service Worker: Fallo al cachear', err))
  // );
  self.skipWaiting(); // Forza al SW a activarse inmediatamente
});

self.addEventListener('activate', event => {
  console.log('Service Worker: Activado');
  // Limpiar cachés antiguas si es necesario
  // event.waitUntil(
  //   caches.keys().then(cacheNames => {
  //     return Promise.all(
  //       cacheNames.map(cache => {
  //         if (cache !== CACHE_NAME) {
  //           console.log('Service Worker: Borrando caché antigua', cache);
  //           return caches.delete(cache);
  //         }
  //       })
  //     );
  //   })
  // );
  return self.clients.claim(); // Permite al SW tomar control de las páginas abiertas inmediatamente
});

self.addEventListener('fetch', event => {
  // console.log('Service Worker: Fetching', event.request.url);
  // Aquí iría la lógica de caché (cache-first, network-first, etc.)
  // Por ahora, solo responde desde la red.
  // event.respondWith(
  //   caches.match(event.request)
  //     .then(response => {
  //       return response || fetch(event.request);
  //     })
  // );
});