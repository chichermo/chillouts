'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import PortalMark from '@/components/PortalMark';
import type { PortalId } from '@/lib/portals';

type BrandSlide = {
  id: 'element' | PortalId;
  label: string;
  accent: string;
};

const SLIDES: BrandSlide[] = [
  { id: 'element', label: 'Element', accent: '#C2E0FC' },
  { id: 'chillouts', label: 'Chill-outs', accent: '#ACE1AF' },
  { id: 'detentions', label: 'Nablijven', accent: '#FFDFB9' },
  { id: 'o2', label: 'O2', accent: '#C2E0FC' },
];

type ElementBrandProps = {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Cycle Element → Chill-outs → Nablijven → O2 with blur (Jitter-style) */
  switcher?: boolean;
  animated?: boolean;
};

const PILL = {
  sm: { w: 200, h: 72, mark: 'h-10 w-10', img: 120 },
  md: { w: 260, h: 92, mark: 'h-14 w-14', img: 160 },
  lg: { w: 300, h: 108, mark: 'h-16 w-16', img: 190 },
} as const;

/**
 * Floating 3D logo pill inspired by Jitter "Blur: Logo Switcher".
 * Optional auto-switcher across Element + app marks.
 */
export default function ElementBrand({
  size = 'md',
  className = '',
  switcher = true,
  animated = true,
}: ElementBrandProps) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const dims = PILL[size];
  const slide = SLIDES[index];

  useEffect(() => {
    if (!switcher || !animated) return;
    const id = window.setInterval(() => {
      setPhase('out');
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % SLIDES.length);
        setPhase('in');
      }, 320);
    }, 2800);
    return () => window.clearInterval(id);
  }, [switcher, animated]);

  const goTo = (next: number) => {
    if (next === index) return;
    setPhase('out');
    window.setTimeout(() => {
      setIndex(next);
      setPhase('in');
    }, 280);
  };

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      <style>{`
        @keyframes logoPillFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .logo-pill-float {
          animation: logoPillFloat 5.5s ease-in-out infinite;
        }
        .logo-blur-in {
          animation: logoBlurIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .logo-blur-out {
          animation: logoBlurOut 0.32s ease-in both;
        }
        @keyframes logoBlurIn {
          from { opacity: 0; filter: blur(14px); transform: scale(0.92); }
          to { opacity: 1; filter: blur(0); transform: scale(1); }
        }
        @keyframes logoBlurOut {
          from { opacity: 1; filter: blur(0); transform: scale(1); }
          to { opacity: 0; filter: blur(12px); transform: scale(1.04); }
        }
      `}</style>

      {/* Soft floor shadow — 3D lift like the Jitter template */}
      <div
        className="pointer-events-none absolute -bottom-3 left-1/2 h-6 w-[70%] -translate-x-1/2 rounded-full blur-xl"
        style={{
          background: `radial-gradient(ellipse, ${slide.accent}55 0%, rgba(0,0,0,0.55) 55%, transparent 75%)`,
        }}
      />

      <div className={`relative ${animated ? 'logo-pill-float' : ''}`}>
        {/* Depth plate under pill */}
        <div
          className="absolute inset-x-2 -bottom-2 top-3 rounded-full opacity-80"
          style={{
            background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.55))',
            filter: 'blur(10px)',
          }}
        />

        {/* The 3D logo pill */}
        <div
          className="relative flex items-center justify-center overflow-hidden rounded-full border border-white/10"
          style={{
            width: dims.w,
            height: dims.h,
            background:
              'linear-gradient(160deg, #2a2a36 0%, #12121a 48%, #0c0c12 100%)',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -8px 18px rgba(0,0,0,0.45), 0 18px 40px rgba(0,0,0,0.55), 0 2px 0 rgba(255,255,255,0.06)',
          }}
          aria-live="polite"
          aria-label={`Logo ${slide.label}`}
        >
          {/* Specular rim */}
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />

          <div
            key={slide.id}
            className={`relative flex h-full w-full items-center justify-center ${
              phase === 'in' ? 'logo-blur-in' : 'logo-blur-out'
            }`}
          >
            {slide.id === 'element' ? (
              <div
                className="flex h-[72%] w-[78%] items-center justify-center overflow-hidden rounded-full bg-white"
                style={{
                  boxShadow:
                    'inset 0 1px 0 rgba(255,255,255,0.9), 0 6px 16px rgba(0,0,0,0.35)',
                }}
              >
                <Image
                  src="/logo.jpg"
                  alt="Element"
                  width={dims.img}
                  height={Math.round(dims.img * 0.5)}
                  priority
                  className="h-[88%] w-[90%] object-contain"
                  style={{
                    objectPosition: '50% 42%',
                    transform: 'scale(1.25)',
                    filter: 'contrast(1.05)',
                  }}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <PortalMark id={slide.id} className={dims.mark} />
                <span className="text-[11px] font-bold tracking-wide text-white/85">
                  {slide.label}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Caption + dots */}
      <div className="mt-4 flex flex-col items-center gap-2">
        <p className="text-[11px] font-semibold tracking-[0.22em] text-white/45 uppercase">
          {slide.label}
        </p>
        {switcher && (
          <div className="flex items-center gap-1.5">
            {SLIDES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Toon ${s.label}`}
                onClick={() => goTo(i)}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === index ? 18 : 6,
                  background: i === index ? s.accent : 'rgba(255,255,255,0.22)',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
