'use client';

import Image from 'next/image';

type ElementBrandProps = {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Show soft float / shine motion */
  animated?: boolean;
};

const SIZES = {
  sm: { box: 'h-14 w-14', img: 44, pad: 'p-2' },
  md: { box: 'h-[4.5rem] w-[4.5rem]', img: 56, pad: 'p-2.5' },
  lg: { box: 'h-24 w-24 md:h-28 md:w-28', img: 88, pad: 'p-3' },
} as const;

/**
 * Compact 3D Element brand mark (not the full poster sheet).
 * Crops into the wordmark area and sits on a depth plate.
 */
export default function ElementBrand({
  size = 'md',
  className = '',
  animated = true,
}: ElementBrandProps) {
  const s = SIZES[size];

  return (
    <div className={`relative inline-flex ${className}`}>
      <style>{`
        @keyframes elementBrandFloat {
          0%, 100% { transform: translateY(0) rotateX(10deg) rotateY(-8deg); }
          50% { transform: translateY(-5px) rotateX(6deg) rotateY(-4deg); }
        }
        @keyframes elementBrandShine {
          0% { transform: translateX(-120%) rotate(18deg); opacity: 0; }
          18% { opacity: 0.55; }
          42% { opacity: 0.15; }
          100% { transform: translateX(160%) rotate(18deg); opacity: 0; }
        }
        @keyframes elementBrandGlow {
          0%, 100% { opacity: 0.45; transform: scale(1); }
          50% { opacity: 0.75; transform: scale(1.06); }
        }
        .element-brand-scene {
          perspective: 900px;
          perspective-origin: 50% 40%;
        }
        .element-brand-card {
          transform-style: preserve-3d;
          transform: rotateX(10deg) rotateY(-8deg);
          transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .element-brand-scene:hover .element-brand-card {
          transform: rotateX(4deg) rotateY(2deg) translateY(-2px);
        }
        .element-brand-card.is-animated {
          animation: elementBrandFloat 5.5s ease-in-out infinite;
        }
        .element-brand-scene:hover .element-brand-card.is-animated {
          animation: none;
        }
        .element-brand-shine {
          animation: elementBrandShine 4.8s ease-in-out infinite;
        }
        .element-brand-glow {
          animation: elementBrandGlow 4.5s ease-in-out infinite;
        }
      `}</style>

      {/* Ambient glow */}
      <div
        className={`element-brand-glow pointer-events-none absolute -inset-4 rounded-full blur-2xl ${animated ? '' : 'opacity-50'}`}
        style={{
          background:
            'radial-gradient(circle, rgba(194,224,252,0.55) 0%, rgba(172,225,175,0.28) 42%, rgba(232,151,163,0.18) 68%, transparent 75%)',
        }}
      />

      <div className="element-brand-scene relative">
        <div
          className={`element-brand-card relative ${s.box} ${animated ? 'is-animated' : ''}`}
        >
          {/* Back plate / depth */}
          <div
            className="absolute inset-0 rounded-[1.35rem]"
            style={{
              transform: 'translateZ(-14px) translateY(8px) scale(0.96)',
              background: 'linear-gradient(145deg, #2a2a3a, #12121a)',
              boxShadow: '0 18px 36px rgba(0,0,0,0.55)',
            }}
          />

          {/* Side rim */}
          <div
            className="absolute inset-0 rounded-[1.35rem]"
            style={{
              background:
                'linear-gradient(145deg, rgba(255,255,255,0.35), rgba(255,255,255,0.05) 40%, rgba(0,0,0,0.25))',
              boxShadow:
                'inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -2px 6px rgba(0,0,0,0.25), 0 12px 28px rgba(0,0,0,0.4)',
            }}
          />

          {/* Front white logo plate */}
          <div
            className={`relative flex h-full w-full items-center justify-center overflow-hidden rounded-[1.2rem] bg-white ${s.pad}`}
            style={{
              boxShadow:
                'inset 0 2px 4px rgba(255,255,255,0.9), inset 0 -3px 8px rgba(0,0,0,0.08), 0 1px 0 rgba(255,255,255,0.5)',
            }}
          >
            <Image
              src="/logo.jpg"
              alt="Element"
              width={s.img}
              height={s.img}
              priority
              className="h-[78%] w-[78%] object-contain object-center"
              style={{
                filter: 'contrast(1.05) saturate(1.05)',
              }}
            />

            {/* Specular sweep */}
            {animated && (
              <div
                className="element-brand-shine pointer-events-none absolute inset-y-[-20%] left-0 w-1/3"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent)',
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
