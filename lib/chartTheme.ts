/** Shared Recharts styling for Rapporten and exports */

export const CHILLOUT_CHART_COLORS = {
  vr: '#3b82f6',
  vl: '#10b981',
  generic: '#fca5a5',
  total: '#8b5cf6',
} as const;

export const LESUUR_COLORS: Record<number, string> = {
  1: '#60a5fa',
  2: '#34d399',
  3: '#fbbf24',
  4: '#f87171',
  5: '#a78bfa',
  6: '#f472b6',
  7: '#22d3ee',
};

export const LESUUR_HOURS = [1, 2, 3, 4, 5, 6, 7] as const;

import type { CSSProperties } from 'react';

export const CHART_TOOLTIP_STYLE: CSSProperties = {
  backgroundColor: 'rgba(26, 26, 46, 0.96)',
  border: '1px solid rgba(255, 255, 255, 0.14)',
  borderRadius: '10px',
  color: '#fff',
  boxShadow: '0 10px 28px rgba(0, 0, 0, 0.35)',
  padding: '10px 12px',
};

export const CHART_AXIS_TICK = { fill: 'rgba(255,255,255,0.78)', fontSize: 11 };
export const CHART_GRID_STROKE = 'rgba(255,255,255,0.08)';
export const BAR_TOP_RADIUS: [number, number, number, number] = [6, 6, 0, 0];
