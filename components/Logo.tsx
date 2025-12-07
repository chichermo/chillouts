'use client';

interface LogoProps {
  variant?: 'full' | 'compact' | 'icon';
  showElements?: boolean;
}

export default function Logo({ variant = 'full', showElements = false }: LogoProps) {
  // Versión compacta para navegación
  if (variant === 'compact') {
    return (
      <div className="flex items-center space-x-2">
        <div className="relative">
          <span className="text-2xl font-black text-white relative inline-block">
            <span className="absolute -bottom-1 left-0 w-full h-1 bg-white rounded-full transform -translate-y-0.5"></span>
            el
          </span>
          <span className="text-2xl font-black text-white">ement</span>
        </div>
      </div>
    );
  }

  // Versión solo icono
  if (variant === 'icon') {
    return (
      <div className="relative w-10 h-10 flex items-center justify-center">
        <span className="text-2xl font-black text-white relative">
          <span className="absolute -bottom-1 left-0 w-3 h-1 bg-white rounded-full transform -translate-y-0.5"></span>
          e
        </span>
      </div>
    );
  }

  // Versión completa con todos los elementos
  return (
    <div className="flex flex-col items-center justify-center relative py-8">
      {/* Diseño abstracto arriba - solo si showElements es true */}
      {showElements && (
        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 flex items-center gap-1">
          {/* Segmentos de abanico con colores suaves */}
          <div className="w-8 h-16 bg-[#E897A3]/40 rounded-tl-full rounded-bl-full transform rotate-12"></div>
          <div className="w-8 h-16 bg-[#C2E0FC]/40 rounded-tl-full rounded-bl-full transform rotate-6"></div>
          <div className="w-8 h-16 bg-[#FFDFB9]/40 rounded-tl-full rounded-bl-full"></div>
          <div className="w-8 h-16 bg-[#9F9EA8]/30 rounded-tl-full rounded-bl-full transform -rotate-6"></div>
          <div className="w-8 h-16 bg-[#ACE1AF]/40 rounded-tl-full rounded-bl-full transform -rotate-12"></div>
        </div>
      )}
      
      {/* Logo principal con texto "element" */}
      <div className="relative">
        <div className="text-4xl md:text-5xl font-black text-white tracking-tight">
          <span className="relative inline-block">
            {/* Arco debajo de "el" */}
            <span className="relative inline-block">
              <span className="absolute -bottom-2 left-0 w-[2.2em] h-2 bg-white rounded-full transform -translate-y-1"></span>
              el
            </span>
            ement
          </span>
        </div>
      </div>
      
      {/* Texto debajo del logo */}
      <div className="mt-2 text-xs md:text-sm font-bold text-white/90 uppercase tracking-wider">
        STERK IN VERBINDING
      </div>
      
      {/* Símbolos de elementos abajo - solo si showElements es true */}
      {showElements && (
        <div className="flex items-center gap-4 mt-8">
          {/* Nube */}
          <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
          </div>
          
          {/* Gota de agua */}
          <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          
          {/* Fuego */}
          <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
            </svg>
          </div>
          
          {/* Viento - dos líneas onduladas */}
          <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8c3 2 5 4 8 4s5-2 8-4" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16c3 2 5 4 8 4s5-2 8-4" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

