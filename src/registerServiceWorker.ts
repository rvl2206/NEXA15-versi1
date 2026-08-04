import { store } from './lib/store';

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('NEXA15 ServiceWorker registered with scope:', registration.scope);

        // Register background sync if supported
        if ('sync' in registration) {
          window.addEventListener('online', () => {
            (registration as any).sync?.register('nexa15-sync-attendance').catch(() => {});
          });
        }
      })
      .catch((error) => {
        console.warn('NEXA15 ServiceWorker registration failed:', error);
      });

    // Listen to messages from Service Worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'TRIGGER_OFFLINE_SYNC') {
        store.processOfflineQueue();
      }
    });
  });
}
