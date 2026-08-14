'use client';

import { useMemo } from 'react';
import type { ChilloutBarPoint } from '@/components/charts/ChilloutStackedBarChart';

/** Soft fills that keep the Jitter block look, tinted per type */
const SEGMENT_COLORS = {
  vr: '#7EB6F2',
  vl: '#6FDBA0',
  generic: '#F5A3B3',
} as const;

interface LesuurCascadeChartProps {
  data: ChilloutBarPoint[];
  height?: number;
  ariaLabel: string;
  isAnimationActive?: boolean;
  title?: string;
}

type Segment = {
  key: 'vr' | 'vl' | 'generic';
  name: string;
  value: number;
  pct: number;
  color: string;
};

/**
 * Jitter "Stacked Chart: Cascade" layout, with VR / VL / Chillouts
 * differentiated as colored segments inside each lesuur layer.
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
        const widthPct = Math.max(34, Math.round((total / maxTotal) * 100));
        const segments: Segment[] = (
          [
            { key: 'vr' as const, name: 'VR', value: d.vr, color: SEGMENT_COLORS.vr },
            { key: 'vl' as const, name: 'VL', value: d.vl, color: SEGMENT_COLORS.vl },
            {
              key: 'generic' as const,
              name: 'Chillouts',
              value: d.generic,
              color: SEGMENT_COLORS.generic,
            },
          ] as const
        )
          .filter((s) => s.value > 0)
          .map((s) => ({
            ...s,
            pct: total > 0 ? (s.value / total) * 100 : 0,
          }));

        return {
          id: d.label,
          label: d.label.startsWith('L') ? `Lesuur ${d.label.slice(1)}` : d.label,
          short: d.label,
          total,
          pct,
          widthPct,
          segments,
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
        @keyframes jitterSegmentIn {
          from { transform: scaleX(0); opacity: 0.5; }
          to { transform: scaleX(1); opacity: 1; }
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
        <div className="flex items-center justify-between gap-3 px-5 pb-1 pt-4 md:px-6">
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

        {/* Type legend */}
        <div className="flex flex-wrap gap-2 px-5 pb-3 md:px-6">
          {(
            [
              { name: 'VR', color: SEGMENT_COLORS.vr },
              { name: 'VL', color: SEGMENT_COLORS.vl },
              { name: 'Chillouts', color: SEGMENT_COLORS.generic },
            ] as const
          ).map((item) => (
            <span
              key={item.name}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold text-white/70"
            >
              <span
                className="h-2 w-2 rounded-[3px] border border-black/40"
                style={{ background: item.color }}
              />
              {item.name}
            </span>
          ))}
        </div>

        {empty ? (
          <div className="flex h-48 items-center justify-center text-sm text-white/40">
            Geen chill-outs in deze periode
          </div>
        ) : (
          <div className="relative px-4 pb-5 pt-1 md:px-5">
            <div className="flex flex-col gap-2.5">
              {layers.map((layer, i) => {
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
                      className="relative overflow-hidden rounded-[6px] border-[2.5px] border-black shadow-[0_10px_0_rgba(0,0,0,0.35)] transition-transform duration-200 hover:-translate-y-0.5"
                      style={{ minHeight: 78 }}
                      title={`${layer.label}: ${layer.total} (${layer.pct}%) · VR ${
                        layer.segments.find((s) => s.key === 'vr')?.value || 0
                      } · VL ${layer.segments.find((s) => s.key === 'vl')?.value || 0} · Chillouts ${
                        layer.segments.find((s) => s.key === 'generic')?.value || 0
                      }`}
                    >
                      {/* Stacked VR / VL / Chillouts fill */}
                      <div className="absolute inset-0 flex">
                        {layer.segments.map((seg, segIndex) => (
                          <div
                            key={seg.key}
                            className="relative h-full origin-left border-r border-black/25 last:border-r-0"
                            style={{
                              width: `${seg.pct}%`,
                              background: seg.color,
                              animation:
                                isAnimationActive
                                  ? `jitterSegmentIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) ${
                                      delay + 0.18 + segIndex * 0.12
                                    }s both`
                                  : undefined,
                            }}
                          >
                            {seg.pct >= 22 && (
                              <span className="absolute bottom-1.5 left-1.5 rounded border border-black/20 bg-black/10 px-1.5 py-0.5 text-[9px] font-black tracking-wide text-black/80">
                                {seg.name} {seg.value}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Soft top gloss */}
                      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-1/2 bg-gradient-to-b from-white/25 to-transparent" />

                      {/* Content overlay */}
                      <div className="relative z-[2] flex items-start justify-between gap-3 px-4 py-3">
                        <div>
                          <div
                            className="text-[28px] font-black leading-none tracking-tight text-black md:text-[32px]"
                            style={{ textShadow: '0 1px 0 rgba(255,255,255,0.35)' }}
                          >
                            {layer.pct}%
                          </div>
                          <div
                            className="mt-1 text-[12px] font-semibold leading-snug text-black/80 md:text-[13px]"
                            style={{ textShadow: '0 1px 0 rgba(255,255,255,0.25)' }}
                          >
                            {layer.label}
                            <span className="text-black/55"> · {layer.total} chill-outs</span>
                          </div>
                        </div>
                        <div className="rounded-md border border-black/20 bg-white/35 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-black/75 backdrop-blur-[2px]">
                          {layer.short}
                        </div>
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
