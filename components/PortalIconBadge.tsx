'use client';

import PortalMark from '@/components/PortalMark';
import type { PortalId } from '@/lib/portals';

type PortalIconBadgeProps = {
  id: PortalId;
  accent: string;
  /** Visual lift on hover (no continuous animation) */
  lifted?: boolean;
  className?: string;
};

/**
 * Static 3D badge matching the Element logo pill treatment:
 * dark depth plate, specular rim, soft floor shadow — no animation.
 */
export default function PortalIconBadge({
  id,
  accent,
  lifted = false,
  className = '',
}: PortalIconBadgeProps) {
  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {/* Soft floor shadow */}
      <div
        className="pointer-events-none absolute -bottom-1.5 left-1/2 h-3 w-[70%] -translate-x-1/2 rounded-full blur-md transition-opacity duration-300"
        style={{
          background: `radial-gradient(ellipse, ${accent}66 0%, rgba(0,0,0,0.55) 60%, transparent 75%)`,
          opacity: lifted ? 0.95 : 0.7,
        }}
      />

      {/* Depth under-plate */}
      <div
        className="absolute inset-x-1 -bottom-1 top-2 rounded-[1.15rem] opacity-80"
        style={{
          background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.5))',
          filter: 'blur(6px)',
        }}
      />

      {/* 3D mark plate — same language as logo pill */}
      <div
        className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[1.25rem] border border-white/10"
        style={{
          background:
            'linear-gradient(160deg, #2a2a36 0%, #12121a 48%, #0c0c12 100%)',
          boxShadow: lifted
            ? `inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -8px 16px rgba(0,0,0,0.45), 0 14px 28px rgba(0,0,0,0.5), 0 0 24px ${accent}33`
            : 'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -8px 16px rgba(0,0,0,0.45), 0 12px 24px rgba(0,0,0,0.45)',
        }}
      >
        {/* Specular rim */}
        <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
        {/* Soft accent wash */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[1.25rem] opacity-30"
          style={{
            background: `radial-gradient(circle at 30% 25%, ${accent}55, transparent 55%)`,
          }}
        />
        <PortalMark id={id} className="relative z-[1] h-14 w-14 drop-shadow-[0_6px_10px_rgba(0,0,0,0.45)]" />
      </div>
    </div>
  );
}
