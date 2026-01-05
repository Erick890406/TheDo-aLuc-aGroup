// Nombre del archivo: sw.js
// Ruta: Debe estar en la misma carpeta que tu archivo HTML

const CACHE_NAME = 'dl-cumanayagua-v32-safe';
const DYNAMIC_CACHE = 'dl-external-assets-v32';

// Lista de archivos sugeridos para caché.
// Si alguno de estos no existe o tiene el nombre mal, el código de abajo
// evitará que la app se rompa, gracias al 'try/catch' en la instalación.
const SUGGESTED_ASSETS = [
    './',                  // La raíz de la carpeta
    './dlcygua.html',      // Tu archivo principal
    './manifest.json',     // El manifiesto
    './img/Logo-DL-Cumanayagua.png' // Tu logo
];

// Instalación del Service Worker (Modo Seguro)
self.addEventListener('install', (event) => {
    // Forzar activación inmediata
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            console.log('[Service Worker] Iniciando caché segura...');
            
            // INTENTO DE CACHÉ INDIVIDUAL
            // Intentamos guardar cada archivo uno por uno.
            // Si uno falla (ej: 404 Not Found), no rompemos la instalación.
            for (const asset of SUGGESTED_ASSETS) {
                try {
                    await cache.add(asset);
                } catch (err) {
                    // Solo advertimos en consola, pero NO detenemos la app
                    console.warn('[SW] No se pudo pre-cachear (no es crítico):', asset);
                }
            }
        })
    );
});

// Activación y Limpieza
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activado y listo');
    event.waitUntil(clients.claim());

    // Borrar cachés viejas para no llenar el teléfono
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME && key !== DYNAMIC_CACHE) {
                    console.log('[Service Worker] Limpiando caché antigua:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
});

// Estrategia de Intercepción (Network First -> Cache Fallback)
self.addEventListener('fetch', (event) => {
    
    // Solo interceptamos peticiones GET (lectura) que sean http/https
    if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
        return;
    }

    // EXCEPCIÓN: La API de Google Script SIEMPRE va por red (no cachear)
    if (event.request.url.includes('script.google.com')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // ESTRATEGIA: Stale-While-Revalidate
    // 1. Buscamos en caché para responder rápido.
    // 2. Al mismo tiempo vamos a la red a buscar la versión más nueva.
    // 3. Si la red responde, actualizamos la caché para la próxima vez.
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                // Si la red responde bien, guardamos copia en caché dinámica
                if(networkResponse && networkResponse.status === 200) {
                    caches.open(DYNAMIC_CACHE).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                    });
                }
                return networkResponse;
            }).catch((err) => {
                // Si falla la red (offline), no hacemos nada aquí,
                // confiaremos en lo que devolvió 'cachedResponse' arriba.
                console.log('[SW] Modo Offline activo para:', event.request.url);
            });

            // Devolver lo que haya en caché, o esperar a la red si no hay nada
            return cachedResponse || fetchPromise;
        })
    );
});