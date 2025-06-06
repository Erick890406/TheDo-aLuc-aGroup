/**
 * Service Worker para la PWA de Lista de Compras PRO
 * Versión del Caché: v1.1
 * 
 * Estrategia de Caché: Cache First
 * - Al instalar, guarda en caché los recursos estáticos esenciales (app shell).
 * - Al recibir una petición (fetch), primero busca en el caché.
 *   - Si lo encuentra, lo sirve desde el caché (rápido y offline).
 *   - Si no, lo busca en la red.
 * - Al activar, limpia los cachés antiguos para mantener la app actualizada.
 */

// 1. Definición de Constantes
// Es buena práctica versionar el caché. Si cambias los archivos cacheados, incrementa la versión (ej. v1.2).
const CACHE_NAME = 'shopping-list-pro-cache-v1.1';

// Lista de archivos que componen el "App Shell". Estos son los recursos mínimos para que la app funcione.
// Se usa './' para rutas relativas, lo cual es más seguro en diferentes entornos de hosting (como subdirectorios de GitHub Pages).
const urlsToCache = [
  './',                      // La página principal (el directorio raíz del proyecto)
  './index.html',            // El archivo HTML principal
  './manifest.json',         // El manifiesto de la aplicación web
  
  // Recursos externos (CDNs)
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  
  // Íconos de la aplicación (¡asegúrate de que estos archivos existan en tu repositorio!)
  './icon-192.png',
  './icon-512.png',
  './maskable-icon.png'
];


// 2. Evento de Instalación (install)
// Se dispara una sola vez cuando el navegador instala el Service Worker.
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  
  // event.waitUntil() asegura que el Service Worker no se considere "instalado" hasta que el código dentro se complete.
  event.waitUntil(
    // Abrimos el caché con el nombre que definimos.
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cache abierto. Cacheando el App Shell...');
        // Agregamos todos los archivos de nuestra lista al caché.
        // 'addAll' es una transacción: si un solo archivo falla, toda la operación falla.
        // Por eso es crucial que todas las rutas en urlsToCache sean correctas.
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: App Shell cacheado con éxito.');
        // Forzamos la activación del nuevo Service Worker inmediatamente.
        return self.skipWaiting();
      })
      .catch(error => {
        // Si addAll falla, veremos este error en la consola.
        console.error('Service Worker: Fallo al cachear el App Shell.', error);
      })
  );
});


// 3. Evento de Activación (activate)
// Se dispara después de la instalación, cuando el Service Worker toma el control de la página.
self.addEventListener('activate', event => {
  console.log('Service Worker: Activando...');

  // Lista de cachés que queremos conservar. En este caso, solo el actual.
  const cacheWhitelist = [CACHE_NAME];

  event.waitUntil(
    // Obtenemos todos los nombres de los cachés existentes.
    caches.keys().then(cacheNames => {
      return Promise.all(
        // Mapeamos sobre cada nombre de caché.
        cacheNames.map(cacheName => {
          // Si un caché existente NO está en nuestra lista blanca...
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('Service Worker: Borrando caché antiguo ->', cacheName);
            // ...lo borramos. Esto es vital para eliminar archivos desactualizados.
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        console.log('Service Worker: Cachés limpios y listos.');
        // Le dice al Service Worker que empiece a controlar las páginas abiertas inmediatamente.
        return self.clients.claim();
    })
  );
});


// 4. Evento de Petición (fetch)
// Se dispara cada vez que la página solicita un recurso (HTML, CSS, JS, imagen, API, etc.).
self.addEventListener('fetch', event => {
  // Ignoramos las peticiones que no son GET, ya que no se pueden cachear.
  if (event.request.method !== 'GET') {
    return;
  }

  // event.respondWith() intercepta la petición y nos permite controlarla.
  event.respondWith(
    // Buscamos una coincidencia para la petición actual en nuestro caché.
    caches.match(event.request)
      .then(cachedResponse => {
        // Si encontramos una respuesta en el caché...
        if (cachedResponse) {
          // ...la devolvemos directamente. Esto hace que la app funcione offline.
          // console.log('Service Worker: Sirviendo desde caché ->', event.request.url);
          return cachedResponse;
        }

        // Si no está en el caché, continuamos con la petición a la red.
        // console.log('Service Worker: Buscando en la red ->', event.request.url);
        return fetch(event.request);
      })
      .catch(error => {
        // Esto podría ocurrir si la red falla y el recurso no está en caché.
        // Aquí podrías devolver una página de "fallback" offline si quisieras.
        console.error('Service Worker: Error en la petición fetch ->', error);
      })
  );
});
