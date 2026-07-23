'use client';

import type { PortalId } from '@/lib/portals';

type PortalMarkProps = {
  id: PortalId;
  className?: string;
};

/** Eigen merkteken per portaal (SVG). */
export default function PortalMark({ id, className = 'h-16 w-16' }: PortalMarkProps) {
  if (id === 'chillouts') {
    return (
      <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden>
        <defs>
          <linearGradient id="coGrad" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ACE1AF" />
            <stop offset="1" stopColor="#5fad6a" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="28" fill="url(#coGrad)" opacity="0.2" />
        <circle cx="32" cy="32" r="22" stroke="url(#coGrad)" strokeWidth="2.5" />
        <path
          d="M32 16c0 8-6 12-6 20a6 6 0 0012 0c0-8-6-12-6-20z"
          fill="url(#coGrad)"
        />
        <circle cx="32" cy="38" r="4" fill="#1a1a28" opacity="0.35" />
        <path
          d="M20 44c4 4 8 6 12 6s8-2 12-6"
          stroke="#ACE1AF"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.7"
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
