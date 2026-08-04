const CACHE_NAME = 'nexa15-app-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event - Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('SW: Some static assets failed to cache', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate event - Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - Cache strategy with Network fallback and API caching
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Handle API Requests
  if (url.pathname.startsWith('/api/')) {
    if (event.request.method === 'GET') {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            if (response.status === 200) {
              const resClone = response.clone();
              caches.open('nexa15-api-cache').then((cache) => {
                cache.put(event.request, resClone);
              });
            }
            return response;
          })
          .catch(() => {
            return caches.match(event.request).then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              return new Response(
                JSON.stringify({
                  success: true,
                  offline: true,
                  message: 'Melayani dari data offline cache',
                }),
                {
                  headers: { 'Content-Type': 'application/json' },
                }
              );
            });
          })
      );
    } else {
      // POST/PUT/DELETE API requests handled directly by app store queue or network
      event.respondWith(
        fetch(event.request).catch(() => {
          return new Response(
            JSON.stringify({
              success: true,
              offlineQueued: true,
              message: 'Data disimpan di antrean lokal (offline queue)',
            }),
            {
              status: 202,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        })
      );
    }
    return;
  }

  // Handle Static Asset & Navigation Requests (Stale-While-Revalidate with SPA Navigation Fallback)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            event.request.method === 'GET' &&
            !url.protocol.startsWith('chrome-extension')
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback to cached index.html for navigation requests when offline
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html') || caches.match('/');
          }
          return undefined;
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// Background Sync Event (if supported by browser)
self.addEventListener('sync', (event) => {
  if (event.tag === 'nexa15-sync-attendance') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'TRIGGER_OFFLINE_SYNC' });
        });
      })
    );
  }
});

// Listen for messages from frontend
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
