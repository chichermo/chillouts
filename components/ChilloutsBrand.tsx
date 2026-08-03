'use client';

import PortalMark from '@/components/PortalMark';

type ChilloutsBrandProps = {
  size?: 'sm' | 'md';
  showLabel?: boolean;
};

/** Compacte Chill-outs merk voor navigatie / headers (geen Element-logo). */
export default function ChilloutsBrand({
  size = 'sm',
  showLabel = true,
}: ChilloutsBrandProps) {
  const markClass = size === 'md' ? 'h-9 w-9' : 'h-7 w-7';
  const titleClass = size === 'md' ? 'text-lg' : 'text-sm';

  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="flex shrink-0 items-center justify-center rounded-xl border border-[#E85A5A]/25 bg-[#E85A5A]/12 p-1">
        <PortalMark id="chillouts" className={markClass} />
      </span>
      {showLabel && (
        <span className={`font-bold tracking-tight text-white ${titleClass}`}>
          Chill-outs
        </span>
      )}
    </span>
  );
}
