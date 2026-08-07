'use client';

import type { PortalId } from '@/lib/portals';

type PortalMarkProps = {
  id: PortalId;
  className?: string;
};

/** Eigen merkteken per Element-app (SVG). */
export default function PortalMark({ id, className = 'h-16 w-16' }: PortalMarkProps) {
  if (id === 'chillouts') {
    // Eigen merk: afgeronde "kamer" + persoon op zitzak (chill-out), geen druppelvorm.
    return (
      <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden>
        <defs>
          <linearGradient id="coGrad" x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ACE1AF" />
            <stop offset="1" stopColor="#5fad6a" />
          </linearGradient>
        </defs>
        {/* Kamer / badge — vierkant, niet rond zoals O2 */}
        <rect x="8" y="8" width="48" height="48" rx="16" fill="url(#coGrad)" opacity="0.18" />
        <rect x="12" y="12" width="40" height="40" rx="13" stroke="url(#coGrad)" strokeWidth="2.5" />
        {/* Zitzak */}
        <ellipse cx="30" cy="44" rx="16" ry="9" fill="url(#coGrad)" />
        <path
          d="M16 42c2-9 10-15 20-14 7 .7 12 5 14 11"
          fill="url(#coGrad)"
        />
        <path
          d="M20 41c3-5 8-8 14-8"
          stroke="#1a1a28"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.22"
        />
        {/* Ontspannen figuur */}
        <circle cx="41" cy="23" r="6.25" fill="url(#coGrad)" />
        <path
          d="M34 31c3-4 7-5 11-3"
          stroke="url(#coGrad)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* Gesloten ogen */}
        <path
          d="M38 22.2c1.1-.9 2.2-.9 3.3 0M42.2 22.2c1.1-.9 2.2-.9 3.3 0"
          stroke="#1a1a28"
          strokeWidth="1.35"
          strokeLinecap="round"
          opacity="0.4"
        />
      </svg>
    );
  }

  if (id === 'detentions') {
    return (
      <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden>
        <defs>
          <linearGradient id="nbGrad" x1="10" y1="6" x2="54" y2="58" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFDFB9" />
            <stop offset="1" stopColor="#e8953a" />
          </linearGradient>
        </defs>
        <rect x="10" y="12" width="44" height="40" rx="10" fill="url(#nbGrad)" opacity="0.18" />
        <rect x="14" y="16" width="36" height="32" rx="8" stroke="url(#nbGrad)" strokeWidth="2.5" />
        <path d="M22 12V10a4 4 0 018 0v2M34 12V10a4 4 0 018 0v2" stroke="#FFDFB9" strokeWidth="2" strokeLinecap="round" />
        <path d="M22 28h20M22 36h14" stroke="#FFDFB9" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="44" cy="40" r="8" fill="url(#nbGrad)" />
        <path d="M44 36v5l3 2" stroke="#1a1a28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // O2 — watersymbool
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden>
      <defs>
        <linearGradient id="o2Grad" x1="16" y1="8" x2="48" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C2E0FC" />
          <stop offset="1" stopColor="#4a9fd8" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#o2Grad)" opacity="0.15" />
      <path
        d="M32 10c8 12 16 20 16 30a16 16 0 11-32 0c0-10 8-18 16-30z"
        fill="url(#o2Grad)"
      />
      <path
        d="M26 38c2 4 4 6 6 6s4-2 6-6"
        stroke="#1a1a28"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.35"
      />
      <circle cx="28" cy="30" r="2.5" fill="white" opacity="0.55" />
    </svg>
  );
}
