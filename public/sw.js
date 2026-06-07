const CACHE_NAME = 'gourmet-stock-cache-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        console.warn('Alguns arquivos não puderam ser pré-cacheados na instalação:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Ignorar chamadas de API externas, Firebase Auth/Firestore ou websocket hmr
  const url = e.request.url;
  if (!url.startsWith('http') || url.includes('/socket.io/') || url.includes('googleapis.com') || url.includes('firebase')) {
    return;
  }

  // Ignorar requisições que não sejam do método GET (como POST do Firebase ou Auth)
  if (e.request.method !== 'GET') {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(e.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseToCache).catch((err) => {
            console.warn('Falha ao adicionar recurso ao cache dinâmico:', err);
          });
        });

        return networkResponse;
      }).catch((fetchErr) => {
        // Fallback offline se o fetch falhar
        if (e.request.mode === 'navigate') {
          return caches.match('/index.html').then((fallback) => {
            return fallback || caches.match('/') || new Response('Offline: Recurso não disponível', {
              status: 503,
              headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
          });
        }
        
        return caches.match(e.request).then((fallback) => {
          if (fallback) return fallback;
          // Retornar um fallback limpo para imagens se necessário, ou gerar Response vazia com erro para não quebrar a Promise
          return new Response('Internet indisponível', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      });
    })
  );
});
