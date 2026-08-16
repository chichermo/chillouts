'use client';

import Image from 'next/image';

type ElementBrandProps = {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animated?: boolean;
};

/**
 * Readable Element wordmark with light 3D presence.
 * Wide plate (not a tiny square card) so "element" stays legible.
 */
export default function ElementBrand({
  size = 'md',
  className = '',
  animated = true,
}: ElementBrandProps) {
  const dims =
    size === 'lg'
      ? { width: 260, height: 112, imgW: 240, radius: 'rounded-2xl' }
      : size === 'sm'
        ? { width: 148, height: 64, imgW: 134, radius: 'rounded-xl' }
        : { width: 200, height: 88, imgW: 184, radius: 'rounded-2xl' };

  return (
    <div className={`relative inline-flex ${className}`}>
      <style>{`
        @keyframes elementMarkFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes elementMarkShine {
          0% { transform: translateX(-130%) skewX(-12deg); opacity: 0; }
          20% { opacity: 0.45; }
          55% { opacity: 0.1; }
          100% { transform: translateX(160%) skewX(-12deg); opacity: 0; }
        }
        .element-mark-wrap {
          filter: drop-shadow(0 14px 28px rgba(0,0,0,0.45)) drop-shadow(0 4px 10px rgba(194,224,252,0.18));
        }
        .element-mark-float {
          animation: elementMarkFloat 5s ease-in-out infinite;
        }
        .element-mark-shine {
          animation: elementMarkShine 5.2s ease-in-out infinite;
        }
      `}</style>

      {/* Soft brand glow behind — not a second card */}
      <div
        className="pointer-events-none absolute -inset-6 rounded-full opacity-70 blur-2xl"
        style={{
          background:
            'radial-gradient(circle, rgba(194,224,252,0.35) 0%, rgba(172,225,175,0.2) 45%, transparent 70%)',
        }}
      />

      <div className={`element-mark-wrap relative ${animated ? 'element-mark-float' : ''}`}>
        <div
          className={`relative overflow-hidden ${dims.radius} bg-white`}
          style={{
            width: dims.width,
            height: dims.height,
            boxShadow:
              '0 1px 0 rgba(255,255,255,0.7) inset, 0 -6px 14px rgba(0,0,0,0.08) inset, 0 10px 0 rgba(0,0,0,0.18), 0 18px 36px rgba(0,0,0,0.35)',
          }}
        >
          {/* Top bevel highlight */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-1/3 bg-gradient-to-b from-white to-transparent opacity-80" />

          <div className="relative flex h-full w-full items-center justify-center px-3 py-2">
            <Image
              src="/logo.jpg"
              alt="Element"
              width={dims.imgW}
              height={Math.round(dims.imgW * 0.55)}
              priority
              className="h-full w-full object-contain object-center"
              style={{
                // Prefer the wordmark band of the sheet
                objectPosition: '50% 42%',
                transform: 'scale(1.35)',
                filter: 'contrast(1.06) saturate(1.04)',
              }}
            />
          </div>

          {animated && (
            <div
              className="element-mark-shine pointer-events-none absolute inset-y-0 left-0 z-[2] w-1/3"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
