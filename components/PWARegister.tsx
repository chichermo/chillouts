'use client';

import { useEffect, useState } from 'react';

/**
 * Registers the service worker and auto-applies updates so an already-installed
 * PWA picks up branding/manifest changes without a manual reinstall.
 * Chrome/Edge still apply the new manifest `name` after all app windows are closed once.
 */
export default function PWARegister() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let updateInterval: ReturnType<typeof setInterval> | undefined;
    let refreshing = false;
    let cancelled = false;
    let regRef: ServiceWorkerRegistration | null = null;

    const activateWaiting = (reg: ServiceWorkerRegistration) => {
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    };

    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SW_ACTIVATED' && navigator.serviceWorker.controller) {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      }
    };

    const onVisibility = () => {
      if (!document.hidden && regRef) {
        regRef.update().catch(() => undefined);
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    navigator.serviceWorker.addEventListener('message', onSwMessage);
    document.addEventListener('visibilitychange', onVisibility);

    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((reg) => {
        if (cancelled) return;
        regRef = reg;
        setRegistration(reg);
        activateWaiting(reg);

        const checkForUpdates = () => {
          reg.update().catch((error) => {
            console.error('[PWA] Update check failed:', error);
          });
        };

        updateInterval = setInterval(checkForUpdates, 30_000);
        checkForUpdates();

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state !== 'installed') return;
            if (navigator.serviceWorker.controller) {
              activateWaiting(reg);
              setUpdateAvailable(true);
            }
          });
        });
      })
      .catch((error) => {
        console.error('[PWA] Service Worker register failed:', error);
      });

    if (window.matchMedia('(display-mode: standalone)').matches) {
      if (!document.title || /chill-?outs\s*beheer/i.test(document.title)) {
        document.title = 'Element';
      }
    }

    return () => {
      cancelled = true;
      if (updateInterval) clearInterval(updateInterval);
      document.removeEventListener('visibilitychange', onVisibility);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      navigator.serviceWorker.removeEventListener('message', onSwMessage);
    };
  }, []);

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      setUpdateAvailable(false);
    } else {
      window.location.reload();
    }
  };

  return (
    <>
      {updateAvailable && (
        <div className="fixed bottom-4 left-4 right-4 z-50 rounded-lg border-2 border-blue-400 bg-blue-600 p-4 text-white shadow-lg md:left-auto md:right-4 md:w-96">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="mb-1 font-semibold">Nieuwe versie beschikbaar</p>
              <p className="text-sm text-blue-100">De app wordt bijgewerkt…</p>
            </div>
            <button
              type="button"
              onClick={handleUpdate}
              className="whitespace-nowrap rounded-md bg-white px-4 py-2 font-semibold text-blue-600 hover:bg-blue-50"
            >
              Bijwerken
            </button>
          </div>
        </div>
      )}
    </>
  );
}
