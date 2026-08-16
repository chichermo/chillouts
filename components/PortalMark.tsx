'use client';

import { useId } from 'react';
import type { PortalId } from '@/lib/portals';

type PortalMarkProps = {
  id: PortalId;
  className?: string;
};

/** Eigen merkteken per Element-app (SVG). */
export default function PortalMark({ id, className = 'h-16 w-16' }: PortalMarkProps) {
  const uid = useId().replace(/:/g, '');

  if (id === 'chillouts') {
    // Ultra-clear: classic beanbag + calm face (few shapes, high contrast)
    const g = `co-${uid}`;
    return (
      <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden>
        <defs>
          <linearGradient id={g} x1="12" y1="10" x2="52" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="#D4F5D7" />
            <stop offset="0.45" stopColor="#ACE1AF" />
            <stop offset="1" stopColor="#5fad6a" />
          </linearGradient>
        </defs>

        {/* Badge */}
        <rect x="8" y="8" width="48" height="48" rx="15" fill={`url(#${g})`} opacity="0.18" />
        <rect
          x="11"
          y="11"
          width="42"
          height="42"
          rx="13"
          stroke={`url(#${g})`}
          strokeWidth="2.5"
          opacity="0.9"
        />

        {/* Beanbag — classic pear/sack silhouette */}
        <path
          d="M16 46c0-10 6-18 16-20 3-.4 5.5.6 7.5 2.5 2-3.5 6.5-5.5 11-3.5 6 2.5 9 9 8 17-1 6-6 9-14 9H24c-5 0-8-2-8-5z"
          fill={`url(#${g})`}
        />
        {/* Seat crease so it reads as a beanbag */}
        <path
          d="M24 36c4-3 9-4 14-2"
          stroke="#1a1a28"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.2"
        />

        {/* Calm face resting on the beanbag */}
        <circle cx="33" cy="24" r="8.5" fill={`url(#${g})`} />
        <circle cx="33" cy="24" r="8.5" fill="#EAFBEB" opacity="0.35" />
        {/* Closed eyes */}
        <path
          d="M28.2 23.2c1.4-1.2 2.9-1.2 4.3 0"
          stroke="#1a1a28"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.55"
        />
        <path
          d="M33.5 23.2c1.4-1.2 2.9-1.2 4.3 0"
          stroke="#1a1a28"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.55"
        />
        {/* Smile */}
        <path
          d="M30 27.2c1.6 1.4 4.4 1.4 6 0"
          stroke="#1a1a28"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.45"
        />
      </svg>
    );
  }

  if (id === 'detentions') {
    // Creatief: "na schooltijd" — klok + bureaulamp (nablijven / after hours)
    const g = `nb-${uid}`;
    return (
      <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden>
        <defs>
          <linearGradient id={g} x1="10" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFE7C8" />
            <stop offset="0.5" stopColor="#FFDFB9" />
            <stop offset="1" stopColor="#e8953a" />
          </linearGradient>
          <linearGradient id={`${g}-glow`} x1="28" y1="18" x2="48" y2="42" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFF6E6" />
            <stop offset="1" stopColor="#FFB86B" />
          </linearGradient>
          <radialGradient id={`${g}-light`} cx="42" cy="28" r="18" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFE0A8" stopOpacity="0.55" />
            <stop offset="1" stopColor="#FFDFB9" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect x="7" y="7" width="50" height="50" rx="16" fill={`url(#${g})`} opacity="0.14" />
        <circle cx="42" cy="28" r="18" fill={`url(#${g}-light)`} />

        {/* Desk surface */}
        <path
          d="M10 46h36c2 0 3 1 3 2.5S48 51 46 51H12c-2 0-3-1-3-2.5S10 46 12 46z"
          fill={`url(#${g})`}
        />
        <path d="M14 46v-6h10v6" stroke={`url(#${g})`} strokeWidth="2.5" strokeLinejoin="round" />
        {/* Chair hint */}
        <path
          d="M40 46v-8c0-2 2-4 5-4h3"
          stroke={`url(#${g})`}
          strokeWidth="2.6"
          strokeLinecap="round"
        />

        {/* Desk lamp — after-hours signal */}
        <path
          d="M22 40V24c0-1 1-2 2-2h10"
          stroke={`url(#${g})`}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M34 22c4-1 8 2 8 6 0 2-1 3-3 4l-7-2c-1-.3-1.5-1.2-1.2-2.2L34 22z"
          fill={`url(#${g}-glow)`}
        />
        <circle cx="41" cy="30" r="2.2" fill="#1a1a28" opacity="0.35" />

        {/* Clock badge — time owed / nablijven */}
        <circle cx="46" cy="16" r="10" fill={`url(#${g})`} />
        <circle cx="46" cy="16" r="7.5" fill="#1a1a28" opacity="0.2" />
        <circle cx="46" cy="16" r="7.5" stroke="#1a1a28" strokeWidth="1.4" opacity="0.35" />
        {/* Hands pointing past school time */}
        <path d="M46 16v-4.5" stroke="#1a1a28" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
        <path d="M46 16l3.8 2.2" stroke="#1a1a28" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
        <circle cx="46" cy="16" r="1.4" fill="#1a1a28" opacity="0.55" />

        {/* Small notebook on desk */}
        <rect x="26" y="39" width="11" height="7" rx="1.5" fill={`url(#${g}-glow)`} opacity="0.95" />
        <path d="M28.5 41.5h6M28.5 43.5h4" stroke="#1a1a28" strokeWidth="1.1" strokeLinecap="round" opacity="0.35" />
      </svg>
    );
  }

  // O2 — watersymbool
  const g = `o2-${uid}`;
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden>
      <defs>
        <linearGradient id={g} x1="16" y1="8" x2="48" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C2E0FC" />
          <stop offset="1" stopColor="#4a9fd8" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill={`url(#${g})`} opacity="0.15" />
      <path
        d="M32 10c8 12 16 20 16 30a16 16 0 11-32 0c0-10 8-18 16-30z"
        fill={`url(#${g})`}
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
