'use client';

import { useState, useEffect } from 'react';

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detectar si es iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Verificar si ya está instalada
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Detectar evento de instalación (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Verificar si ya está instalada después de un tiempo
    setTimeout(() => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        setShowButton(false);
      }
    }, 1000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Para iOS, mostrar instrucciones
      if (isIOS) {
        alert(
          'Om de app te installeren:\n\n' +
          '1. Tik op de deelknop (vierkant met pijl)\n' +
          '2. Scroll naar beneden\n' +
          '3. Tik op "Voeg toe aan beginscherm"\n' +
          '4. Tik op "Toevoegen"'
        );
      }
      return;
    }

    // Mostrar el prompt de instalación
    deferredPrompt.prompt();

    // Esperar a que el usuario responda
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('Usuario aceptó la instalación');
      setIsInstalled(true);
      setShowButton(false);
    } else {
      console.log('Usuario rechazó la instalación');
    }

    // Limpiar el prompt
    setDeferredPrompt(null);
  };

  // No mostrar si ya está instalada
  if (isInstalled) {
    return null;
  }

  // No mostrar si no hay prompt disponible y no es iOS
  if (!showButton && !isIOS) {
    return null;
  }

  return (
    <button
      onClick={handleInstallClick}
      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-green to-emerald-600 text-white rounded-lg hover:from-brand-green/90 hover:to-emerald-600/90 font-semibold transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
      title={isIOS ? 'Installatie-instructies' : 'App installeren'}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
      <span className="hidden sm:inline">
        {isIOS ? 'Installeren' : 'App Installeren'}
      </span>
      <span className="sm:hidden">Installeer</span>
    </button>
  );
}

