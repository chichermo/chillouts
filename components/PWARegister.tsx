'use client';

import { useEffect, useState } from 'react';

export default function PWARegister() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Registrar service worker
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((reg) => {
          console.log('[PWA] Service Worker registrado:', reg.scope);
          setRegistration(reg);

          // Verificar actualizaciones periódicamente
          const checkForUpdates = () => {
            reg.update().catch((error) => {
              console.error('[PWA] Error al verificar actualizaciones:', error);
            });
          };

          // Verificar actualizaciones cada 60 segundos
          const updateInterval = setInterval(checkForUpdates, 60000);

          // Verificar actualizaciones cuando la página vuelve a estar visible
          document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
              checkForUpdates();
            }
          });

          // Detectar cuando hay una nueva versión disponible
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // Hay una nueva versión disponible
                  setUpdateAvailable(true);
                }
              });
            }
          });

          return () => {
            clearInterval(updateInterval);
          };
        })
        .catch((error) => {
          console.error('[PWA] Error al registrar Service Worker:', error);
        });

      // Manejar actualizaciones del service worker
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  }, []);

  const handleUpdate = () => {
    if (registration?.waiting) {
      // Enviar mensaje al service worker para que se active
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      setUpdateAvailable(false);
      // Recargar la página después de un breve delay
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  };

  return (
    <>
      {updateAvailable && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-blue-600 text-white p-4 rounded-lg shadow-lg border-2 border-blue-400">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="font-semibold mb-1">Nieuwe versie beschikbaar</p>
              <p className="text-sm text-blue-100">Klik om de app bij te werken</p>
            </div>
            <button
              onClick={handleUpdate}
              className="px-4 py-2 bg-white text-blue-600 rounded-md font-semibold hover:bg-blue-50 whitespace-nowrap"
            >
              Bijwerken
            </button>
          </div>
        </div>
      )}
    </>
  );
}

