'use client';

import { ReactNode } from 'react';

interface StickyTableWrapProps {
  children: ReactNode;
  className?: string;
  /** Eerste kolom blijft zichtbaar bij horizontaal scrollen */
  stickyFirstColumn?: boolean;
  maxHeight?: string;
}

/** Scrollbare tabelwrapper met optioneel sticky eerste kolom (mobiel). */
export default function StickyTableWrap({
  children,
  className = '',
  stickyFirstColumn = true,
  maxHeight,
}: StickyTableWrapProps) {
  return (
    <div
      className={`overflow-x-auto ${maxHeight ? 'overflow-y-auto' : ''} ${className}`}
      style={maxHeight ? { maxHeight } : undefined}
    >
      <div className={stickyFirstColumn ? 'table-scroll-sticky min-w-max' : 'min-w-max'}>
        {children}
      </div>
    </div>
  );
}
