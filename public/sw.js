// Service Worker mejorado para PWA con actualización automática
// Versión del caché - incrementar para forzar actualización
const CACHE_VERSION = 'v2';
const CACHE_NAME = `chillapp-${CACHE_VERSION}`;
const RUNTIME_CACHE = 'chillapp-runtime';

// Archivos críticos para cachear en la instalación
const urlsToCache = [
  '/',
  '/login',
  '/manifest.json',
];

// Instalación del service worker
self.addEventListener('install', (event) => {
  // Forzar activación inmediata del nuevo service worker
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache abierto:', CACHE_NAME);
        // Cachear solo archivos críticos, no todos
        return cache.addAll(urlsToCache.map(url => new Request(url, { cache: 'reload' })));
      })
      .catch((error) => {
        console.error('[SW] Error al cachear:', error);
      })
  );
});

// Activación del service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Limpiar caches antiguos
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('[SW] Eliminando cache antiguo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Tomar control inmediatamente
      self.clients.claim()
    ])
  );
});

// Estrategia: Network First, luego Cache (stale-while-revalidate)
self.addEventListener('fetch', (event) => {
  // Solo interceptar peticiones GET
  if (event.request.method !== 'GET') {
    return;
  }

  // No cachear peticiones a APIs externas o recursos dinámicos
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // Para HTML, siempre intentar red primero
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Si la red funciona, actualizar el cache
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Si falla la red, intentar desde cache
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Si no hay cache, devolver página offline básica
            return new Response('Sin conexión', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/html',
              }),
            });
          });
        })
    );
    return;
  }

  // Para otros recursos (JS, CSS, imágenes), usar stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Intentar obtener de la red en paralelo
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          // Si la respuesta es válida, actualizar el cache
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Si falla la red, no hacer nada (ya tenemos cachedResponse)
        });

      // Devolver cache inmediatamente si existe, o esperar la red
      return cachedResponse || fetchPromise;
    })
  );
});

// Escuchar mensajes para forzar actualización
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

