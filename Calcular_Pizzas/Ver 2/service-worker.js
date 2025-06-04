const CACHE_NAME = 'pizza-calc-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/fontawesome/css/all.min.css',
  '/fontawesome/webfonts/fa-solid-900.woff2',
  '/fontawesome/webfonts/fa-regular-400.woff2',
  '/fonts/poppins-v20-latin-regular.woff2',
  '/fonts/poppins-v20-latin-700.woff2',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto:', CACHE_NAME);
        const promises = urlsToCache.map(url => {
            return cache.add(url).catch(err => {
                console.warn(`Fallo al cachear ${url}:`, err);
            });
        });
        return Promise.all(promises);
      })
      .then(() => {
          console.log("Recursos básicos cacheados.");
      })
      .catch(err => {
          console.error('Fallo general al abrir cache o cachear durante la instalación:', err);
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Eliminando cache viejo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(
          response => {
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return response;
          }
        ).catch(error => {
            console.error(`Fetch fallido para ${event.request.url}:`, error);
        });
      })
  );
});