'use client';

import { useMemo, useState } from 'react';
import { CHILLOUT_CHART_COLORS } from '@/lib/chartTheme';
import type { ChilloutBarPoint } from '@/components/charts/ChilloutStackedBarChart';

type SeriesKey = 'vr' | 'vl' | 'generic';

const SERIES: { key: SeriesKey; name: string; color: string }[] = [
  { key: 'vr', name: 'VR', color: CHILLOUT_CHART_COLORS.vr },
  { key: 'vl', name: 'VL', color: CHILLOUT_CHART_COLORS.vl },
  { key: 'generic', name: 'Chillouts', color: CHILLOUT_CHART_COLORS.generic },
];

interface LesuurCascadeChartProps {
  data: ChilloutBarPoint[];
  height?: number;
  ariaLabel: string;
  /** Disable entrance motion (e.g. PDF/export capture) */
  isAnimationActive?: boolean;
}

/**
 * Presentation-style stacked cascade chart (Jitter "Stacked Chart: Cascade").
 * Not a classic analytics bar chart: separated rounded layers cascade into place.
 */
export default function LesuurCascadeChart({
  data,
  height = 320,
  ariaLabel,
  isAnimationActive = true,
}: LesuurCascadeChartProps) {
  const [hovered, setHovered] = useState<{ col: number; key: SeriesKey } | null>(null);

  const maxTotal = useMemo(
    () => Math.max(1, ...data.map((d) => d.vr + d.vl + d.generic)),
    [data]
  );

  const plotH = Math.max(180, height - 88);

  return (
    <div role="img" aria-label={ariaLabel} className="w-full min-w-0 select-none">
      <style>{`
        @keyframes jitterCascadeLayer {
          0% {
            opacity: 0;
            transform: translateY(-28px) scale(0.92);
            filter: blur(4px);
          }
          55% {
            opacity: 1;
            filter: blur(0);
          }
          78% {
            transform: translateY(3px) scale(1.02);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }
        @keyframes jitterCascadeRail {
          from { opacity: 0; transform: scaleY(0.4); }
          to { opacity: 1; transform: scaleY(1); }
        }
        @keyframes jitterCascadeLabel {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes jitterCascadeTotal {
          from { opacity: 0; transform: translateY(6px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .jitter-cascade-root {
          --cascade-ease: cubic-bezier(0.22, 1.15, 0.36, 1);
        }
      `}</style>

      {/* Legend — pill markers like motion templates */}
      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        {SERIES.map((s, i) => (
          <span
            key={s.key}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/80"
            style={
              isAnimationActive
                ? {
                    animation: `jitterCascadeLabel 0.45s var(--cascade-ease) ${0.05 + i * 0.08}s both`,
                  }
                : undefined
            }
          >
            <span
              className="h-2.5 w-2.5 rounded-full shadow-[0_0_12px_currentColor]"
              style={{ background: s.color, color: s.color }}
            />
            {s.name}
          </span>
        ))}
      </div>

      <div
        className="jitter-cascade-root relative overflow-hidden rounded-[1.35rem] border border-white/[0.08] px-3 pb-3 pt-5 md:px-5"
        style={{
          minHeight: height,
          background:
            'radial-gradient(120% 90% at 50% 0%, rgba(194,224,252,0.10), transparent 55%), radial-gradient(90% 70% at 80% 100%, rgba(172,225,175,0.08), transparent 50%), linear-gradient(180deg, rgba(28,28,42,0.92), rgba(18,18,28,0.98))',
        }}
      >
        {/* Soft floor glow */}
        <div
          className="pointer-events-none absolute inset-x-8 bottom-10 h-16 rounded-full opacity-50 blur-2xl"
          style={{
            background:
              'linear-gradient(90deg, rgba(59,130,246,0.25), rgba(16,185,129,0.22), rgba(252,165,165,0.2))',
          }}
        />

        <div
          className="relative grid items-end gap-2 sm:gap-3"
          style={{
            gridTemplateColumns: `repeat(${Math.max(data.length, 1)}, minmax(0, 1fr))`,
            height: plotH,
          }}
        >
          {data.map((col, colIndex) => {
            const total = col.vr + col.vl + col.generic;
            const stackH = (total / maxTotal) * (plotH - 36);
            const layers = SERIES.map((s) => ({
              ...s,
              value: col[s.key],
              pct: total > 0 ? col[s.key] / total : 0,
            })).filter((l) => l.value > 0);

            // Empty column still shows rail
            const showLayers =
              layers.length > 0
                ? layers
                : [];

            return (
              <div key={col.label} className="flex h-full flex-col items-center justify-end">
                {/* Total above stack */}
                <div
                  className="mb-1.5 text-[11px] font-bold tabular-nums text-white/90"
                  style={
                    isAnimationActive
                      ? {
                          animation: `jitterCascadeTotal 0.5s var(--cascade-ease) ${
                            0.9 + colIndex * 0.08 + SERIES.length * 0.22
                          }s both`,
                        }
                      : undefined
                  }
                >
                  {total > 0 ? total : ''}
                </div>

                <div
                  className="relative flex w-full max-w-[52px] flex-col justify-end sm:max-w-[58px]"
                  style={{ height: plotH - 28 }}
                >
                  {/* Track / rail */}
                  <div
                    className="absolute inset-x-[18%] bottom-0 top-0 rounded-full bg-white/[0.04]"
                    style={
                      isAnimationActive
                        ? {
                            transformOrigin: 'bottom center',
                            animation: `jitterCascadeRail 0.55s var(--cascade-ease) ${
                              colIndex * 0.05
                            }s both`,
                          }
                        : undefined
                    }
                  />

                  {/* Stack — bottom to top = VR → VL → Chillouts */}
                  <div
                    className="relative z-[1] mx-auto flex w-[78%] flex-col-reverse gap-[3px]"
                    style={{ height: Math.max(stackH, total > 0 ? 8 : 0) }}
                  >
                    {showLayers.map((layer) => {
                      const seriesIndex = SERIES.findIndex((s) => s.key === layer.key);
                      const delay =
                        colIndex * 0.07 + seriesIndex * 0.28;
                      const isHot =
                        hovered?.col === colIndex && hovered.key === layer.key;
                      const segH = Math.max(10, layer.pct * stackH - (showLayers.length > 1 ? 1 : 0));

                      return (
                        <button
                          key={layer.key}
                          type="button"
                          title={`${col.label}: ${layer.name} ${layer.value}`}
                          className="relative w-full origin-bottom rounded-[10px] border border-white/15 outline-none transition-[filter,transform] duration-200"
                          style={{
                            height: segH,
                            background: `linear-gradient(180deg, ${layer.color}ee 0%, ${layer.color} 55%, ${layer.color}cc 100%)`,
                            boxShadow: isHot
                              ? `0 10px 28px ${layer.color}66, inset 0 1px 0 rgba(255,255,255,0.35)`
                              : `0 8px 18px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.28)`,
                            transform: isHot ? 'scale(1.04)' : undefined,
                            animation: isAnimationActive
                              ? `jitterCascadeLayer 0.85s var(--cascade-ease) ${delay}s both`
                              : undefined,
                          }}
                          onMouseEnter={() => setHovered({ col: colIndex, key: layer.key })}
                          onMouseLeave={() => setHovered(null)}
                          onFocus={() => setHovered({ col: colIndex, key: layer.key })}
                          onBlur={() => setHovered(null)}
                        >
                          {/* Gloss */}
                          <span
                            className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-[10px] opacity-40"
                            style={{
                              background:
                                'linear-gradient(180deg, rgba(255,255,255,0.45), transparent)',
                            }}
                          />
                          {segH >= 22 && (
                            <span className="relative z-[1] flex h-full items-center justify-center text-[10px] font-bold tabular-nums text-[#0f1020]/85">
                              {layer.value}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* X labels */}
        <div
          className="mt-3 grid gap-2 sm:gap-3"
          style={{ gridTemplateColumns: `repeat(${Math.max(data.length, 1)}, minmax(0, 1fr))` }}
        >
          {data.map((col, colIndex) => (
            <div
              key={col.label}
              className="text-center text-[11px] font-semibold tracking-wide text-white/55"
              style={
                isAnimationActive
                  ? {
                      animation: `jitterCascadeLabel 0.4s var(--cascade-ease) ${
                        0.35 + colIndex * 0.06
                      }s both`,
                    }
                  : undefined
              }
            >
              {col.label}
            </div>
          ))}
        </div>

        {/* Hover detail */}
        {hovered && data[hovered.col] && (
          <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-xl border border-white/15 bg-[#12121c]/95 px-3 py-2 text-xs text-white shadow-xl backdrop-blur-md">
            <span className="font-semibold text-white/90">{data[hovered.col].label}</span>
            <span className="mx-1.5 text-white/30">·</span>
            <span style={{ color: SERIES.find((s) => s.key === hovered.key)?.color }}>
              {SERIES.find((s) => s.key === hovered.key)?.name}
            </span>
            <span className="ml-1.5 font-bold tabular-nums">
              {data[hovered.col][hovered.key]}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
