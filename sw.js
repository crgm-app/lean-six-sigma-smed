/**
 * SMED Analyzer Pro - Service Worker
 * Permite funcionalidad offline e instalación como PWA
 * Sistema de actualización automática v2.2
 */

const VERSION = '2.2';
const CACHE_NAME = `smed-analyzer-v${VERSION}`;
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './css/styles.css',
    './js/app.js',
    './js/updater.js',
    './js/charts.js',
    './js/statistics.js',
    './js/gantt.js',
    './js/reports.js',
    './js/googleDrive.js',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
    console.log(`[SW v${VERSION}] Instalando Service Worker...`);
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log(`[SW v${VERSION}] Cacheando archivos...`);
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                console.log(`[SW v${VERSION}] Instalación completada`);
                // skipWaiting() fuerza la activación inmediata del nuevo SW
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error(`[SW v${VERSION}] Error durante instalación:`, error);
            })
    );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
    console.log(`[SW v${VERSION}] Activando Service Worker...`);
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                // Eliminar todos los cachés antiguos
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log(`[SW v${VERSION}] Eliminando cache antiguo:`, cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log(`[SW v${VERSION}] Activación completada`);
                // claim() toma control inmediato de todas las páginas
                return self.clients.claim();
            })
            .then(() => {
                // Notificar a todos los clientes que hay una nueva versión
                return self.clients.matchAll().then((clients) => {
                    clients.forEach((client) => {
                        client.postMessage({
                            type: 'SW_UPDATED',
                            version: VERSION
                        });
                    });
                });
            })
    );
});

// Interceptar peticiones de red
self.addEventListener('fetch', (event) => {
    // Ignorar peticiones de extensiones de Chrome
    if (event.request.url.startsWith('chrome-extension://')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // Si está en cache, devolver desde cache
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // Si no, intentar desde la red
                return fetch(event.request)
                    .then((networkResponse) => {
                        // Si la respuesta es válida, guardar en cache
                        if (networkResponse && networkResponse.status === 200) {
                            const responseClone = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseClone);
                                });
                        }
                        return networkResponse;
                    })
                    .catch(() => {
                        // Si falla la red y es una página HTML, mostrar página offline
                        if (event.request.destination === 'document') {
                            return caches.match('./index.html');
                        }
                    });
            })
    );
});

// Escuchar mensajes del cliente
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Sincronización en segundo plano (cuando vuelve la conexión)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-data') {
        console.log('[SW] Sincronizando datos...');
    }
});

// Logging de versión
console.log(`[SW v${VERSION}] Service Worker cargado y listo`);
