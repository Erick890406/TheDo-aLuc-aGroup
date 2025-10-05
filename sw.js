// ====================================================================================
// Service Worker para DL Cumanayagua PWA
// Versión: 1.3
// Autor: Erick Olivera (con asistencia de IA)
// Descripción: Este Service Worker maneja el cacheo de recursos para permitir
// el funcionamiento offline de la aplicación, mejorar la velocidad de carga
// y proporcionar una experiencia de usuario más robusta.
// ====================================================================================

// Define un nombre y versión para la caché de nuestra PWA.
// ¡IMPORTANTE! Cambia este número de versión (ej. 'v1.4') cada vez que
// hagas cambios en los archivos cacheados para forzar la actualización.
const CACHE_NAME = 'dl-cumanayagua-cache-v1.3';

// Lista de archivos y recursos esenciales que queremos guardar en la caché
// para que la app funcione offline desde el primer momento.
const urlsToCache = [
  // --- Archivos Locales Esenciales ---
  './portal-cliente-usd.html',
  './manifest.json',

  // --- Iconos de la App (para el manifest.json) ---
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',

  // --- Imágenes Clave de la UI y Placeholders ---
  './img/Logo-DL-Cumanayagua.png',
  './img/placeholder-product.png',
  './img/placeholder-avatar.png',
  './Dl Cumanayagua Logo reveal.mp4', // Video de introducción

  // --- Recursos Externos (CDN) ---
  // Estilos
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css',

  // Scripts
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
];


// =================================================
// CICLO DE VIDA DEL SERVICE WORKER
// =================================================

// 1. Evento 'install': Se dispara cuando el Service Worker se instala por primera vez.
// Aquí es donde pre-cacheadamos los archivos estáticos importantes.
self.addEventListener('install', event => {
  console.log('[Service Worker] Evento: install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cache abierta. Guardando archivos iniciales...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[Service Worker] Todos los archivos iniciales han sido cacheados exitosamente.');
        // Forzar al nuevo Service Worker a activarse inmediatamente.
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[Service Worker] Falló el cacheo inicial de archivos:', err);
      })
  );
});

// 2. Evento 'activate': Se dispara cuando un nuevo Service Worker se activa.
// Este es el lugar ideal para limpiar cachés viejas y obsoletas.
self.addEventListener('activate', event => {
  console.log('[Service Worker] Evento: activate');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Si el nombre de la caché no es el actual, la borramos.
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Borrando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Tomar control inmediato de todas las páginas abiertas.
      return self.clients.claim();
    })
  );
});

// 3. Evento 'fetch': Se dispara cada vez que la página pide un recurso (una imagen, un CSS, etc.).
// Aquí interceptamos la petición y aplicamos nuestra estrategia de caché.
self.addEventListener('fetch', event => {
  // Ignorar las peticiones al script de Google Apps Script para no cachear datos dinámicos.
  if (event.request.url.startsWith('https://script.google.com/macros/s/')) {
    // Simplemente dejamos que la petición continúe a la red.
    return;
  }

  // Estrategia: "Cache First, falling back to Network"
  // Ideal para recursos estáticos. Es muy rápido.
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Si encontramos el recurso en la caché, lo devolvemos inmediatamente.
        if (cachedResponse) {
          // console.log('[Service Worker] Sirviendo desde caché:', event.request.url);
          return cachedResponse;
        }

        // Si no está en la caché, lo pedimos a la red.
        return fetch(event.request).then(
          networkResponse => {
            // Si la petición a la red fue exitosa, la guardamos en la caché para futuras peticiones.
            // Verificamos que sea una respuesta válida antes de cachearla.
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone(); // Clonamos la respuesta
              caches.open(CACHE_NAME)
                .then(cache => {
                  // console.log('[Service Worker] Cacheando nuevo recurso:', event.request.url);
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          }
        ).catch(error => {
            console.error('[Service Worker] Error de fetch. El usuario podría estar offline.', error);
            // Opcional: podrías devolver una imagen o página de fallback si la petición falla.
            // Por ejemplo, para una imagen:
            // if (event.request.destination === 'image') {
            //   return caches.match('./img/placeholder-product.png');
            // }
        });
      })
  );
});
