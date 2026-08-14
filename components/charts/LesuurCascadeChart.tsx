'use client';

import { useMemo } from 'react';
import { CHILLOUT_CHART_COLORS } from '@/lib/chartTheme';
import type { ChilloutBarPoint } from '@/components/charts/ChilloutStackedBarChart';

/** Palette close to the Jitter cascade template blocks */
const LAYER_COLORS = [
  '#8EC5F7', // soft blue
  '#C8CBD2', // soft gray
  '#FF8A3D', // orange
  '#D6F26A', // lime
  '#C4A484', // tan
  '#F5A3B3', // rose (maps to chillouts brand)
  '#7DDEA8', // mint (maps to VL)
] as const;

interface LesuurCascadeChartProps {
  data: ChilloutBarPoint[];
  height?: number;
  ariaLabel: string;
  isAnimationActive?: boolean;
  title?: string;
}

/**
 * Visual replica of Jitter "Stacked Chart: Cascade":
 * horizontal layers with alternating offsets, bold %, cascade entrance.
 * Mapped to Chill-outs per Lesuur.
 */
export default function LesuurCascadeChart({
  data,
  height = 420,
  ariaLabel,
  isAnimationActive = true,
  title = 'Chill-outs per Lesuur',
}: LesuurCascadeChartProps) {
  const layers = useMemo(() => {
    const grandTotal = data.reduce((s, d) => s + d.vr + d.vl + d.generic, 0);
    const maxTotal = Math.max(1, ...data.map((d) => d.vr + d.vl + d.generic));

    return data
      .map((d, index) => {
        const total = d.vr + d.vl + d.generic;
        const pct = grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0;
        const widthPct = Math.max(28, Math.round((total / maxTotal) * 100));
        const dominant =
          total <= 0
            ? null
            : d.vr >= d.vl && d.vr >= d.generic
              ? 'VR'
              : d.vl >= d.generic
                ? 'VL'
                : 'Chillouts';
        return {
          id: d.label,
          label: d.label.startsWith('L') ? `Lesuur ${d.label.slice(1)}` : d.label,
          short: d.label,
          total,
          pct,
          widthPct,
          dominant,
          vr: d.vr,
          vl: d.vl,
          generic: d.generic,
          color: LAYER_COLORS[index % LAYER_COLORS.length],
          index,
        };
      })
      .filter((l) => l.total > 0);
  }, [data]);

  const empty = layers.length === 0;

  return (
    <div role="img" aria-label={ariaLabel} className="w-full min-w-0">
      <style>{`
        @keyframes jitterLayerIn {
          0% {
            opacity: 0;
            transform: translateY(-36px) scale(0.96);
            filter: blur(6px);
          }
          60% {
            opacity: 1;
            filter: blur(0);
          }
          80% {
            transform: translateY(4px) scale(1.01);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }
        @keyframes jitterCardIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        className="relative overflow-hidden rounded-[1.25rem] border border-black/40"
        style={{
          minHeight: height,
          background: '#1a1a1a',
          boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
          animation: isAnimationActive ? 'jitterCardIn 0.45s ease-out both' : undefined,
        }}
      >
        {/* Header — matches template chrome */}
        <div className="flex items-center justify-between px-5 pb-2 pt-4 md:px-6">
          <h3 className="text-[15px] font-semibold tracking-tight text-white/90">{title}</h3>
          <div className="flex items-center gap-3 text-white/35">
            <span className="inline-flex gap-1">
              <span className="h-1 w-1 rounded-full bg-current" />
              <span className="h-1 w-1 rounded-full bg-current" />
              <span className="h-1 w-1 rounded-full bg-current" />
            </span>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          </div>
        </div>

        {empty ? (
          <div className="flex h-48 items-center justify-center text-sm text-white/40">
            Geen chill-outs in deze periode
          </div>
        ) : (
          <div className="relative px-4 pb-5 pt-2 md:px-5">
            <div className="flex flex-col gap-2.5">
              {layers.map((layer, i) => {
                // Zig-zag horizontal offset like the Jitter template
                const side = i % 2 === 0 ? 'left' : 'right';
                const inset = i === 0 ? 0 : 10 + (i % 3) * 4;
                const delay = 0.12 + i * 0.28;

                return (
                  <div
                    key={layer.id}
                    className="relative"
                    style={{
                      [side === 'left' ? 'marginRight' : 'marginLeft']: `${inset}%`,
                      [side === 'left' ? 'marginLeft' : 'marginRight']: 0,
                      width: `${layer.widthPct}%`,
                      maxWidth: '100%',
                      animation: isAnimationActive
                        ? `jitterLayerIn 0.9s cubic-bezier(0.22, 1.2, 0.36, 1) ${delay}s both`
                        : undefined,
                    }}
                  >
                    <div
                      className="relative overflow-hidden rounded-[6px] border-[2.5px] border-black px-4 py-3 shadow-[0_10px_0_rgba(0,0,0,0.35)] transition-transform duration-200 hover:-translate-y-0.5"
                      style={{ background: layer.color, minHeight: 72 }}
                      title={`${layer.label}: ${layer.total} (${layer.pct}%) · VR ${layer.vr} · VL ${layer.vl} · Chillouts ${layer.generic}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[28px] font-black leading-none tracking-tight text-black md:text-[32px]">
                            {layer.pct}%
                          </div>
                          <div className="mt-1 text-[12px] font-semibold leading-snug text-black/75 md:text-[13px]">
                            {layer.label}
                            <span className="text-black/50"> · {layer.total} chill-outs</span>
                          </div>
                        </div>
                        <div className="rounded-md border border-black/15 bg-black/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-black/70">
                          {layer.short}
                        </div>
                      </div>

                      {/* Mini breakdown chips */}
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {layer.vr > 0 && (
                          <span
                            className="rounded-full border border-black/15 px-2 py-0.5 text-[10px] font-bold text-black/80"
                            style={{ background: `${CHILLOUT_CHART_COLORS.vr}55` }}
                          >
                            VR {layer.vr}
                          </span>
                        )}
                        {layer.vl > 0 && (
                          <span
                            className="rounded-full border border-black/15 px-2 py-0.5 text-[10px] font-bold text-black/80"
                            style={{ background: `${CHILLOUT_CHART_COLORS.vl}55` }}
                          >
                            VL {layer.vl}
                          </span>
                        )}
                        {layer.generic > 0 && (
                          <span
                            className="rounded-full border border-black/15 px-2 py-0.5 text-[10px] font-bold text-black/80"
                            style={{ background: `${CHILLOUT_CHART_COLORS.generic}99` }}
                          >
                            Chillouts {layer.generic}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
