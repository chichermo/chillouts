'use client';

import { useMemo } from 'react';
import type { ChilloutBarPoint } from '@/components/charts/ChilloutStackedBarChart';

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
 * Jitter cascade layers with VR / VL / Chillouts color segments inside each bar.
 * Content is laid out in fixed rows so labels never overlap the fill badges.
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
        // Keep bars wide enough for readable typography
        const widthPct = Math.max(48, Math.round((total / maxTotal) * 100));
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
            transform: translateY(-28px) scale(0.97);
            filter: blur(4px);
          }
          70% { opacity: 1; filter: blur(0); }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }
        @keyframes jitterSegmentIn {
          from { transform: scaleX(0); opacity: 0.55; }
          to { transform: scaleX(1); opacity: 1; }
        }
        @keyframes jitterCardIn {
          from { opacity: 0; transform: translateY(8px); }
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
            <div className="flex flex-col gap-3">
              {layers.map((layer, i) => {
                const side = i % 2 === 0 ? 'left' : 'right';
                const inset = i === 0 ? 0 : 8 + (i % 3) * 3;
                const delay = 0.1 + i * 0.24;

                return (
                  <div
                    key={layer.id}
                    className="relative min-w-[220px]"
                    style={{
                      [side === 'left' ? 'marginRight' : 'marginLeft']: `${inset}%`,
                      width: `${layer.widthPct}%`,
                      maxWidth: '100%',
                      animation: isAnimationActive
                        ? `jitterLayerIn 0.85s cubic-bezier(0.22, 1.15, 0.36, 1) ${delay}s both`
                        : undefined,
                    }}
                  >
                    <div
                      className="relative overflow-hidden rounded-[6px] border-[2.5px] border-black shadow-[0_10px_0_rgba(0,0,0,0.35)]"
                      title={`${layer.label}: ${layer.total} (${layer.pct}%)`}
                    >
                      {/* Color stack — background only, no text inside segments */}
                      <div className="absolute inset-0 flex" aria-hidden>
                        {layer.segments.map((seg, segIndex) => (
                          <div
                            key={seg.key}
                            className="h-full origin-left border-r border-black/20 last:border-r-0"
                            style={{
                              width: `${seg.pct}%`,
                              background: seg.color,
                              animation: isAnimationActive
                                ? `jitterSegmentIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) ${
                                    delay + 0.15 + segIndex * 0.1
                                  }s both`
                                : undefined,
                            }}
                          />
                        ))}
                      </div>

                      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-10 bg-gradient-to-b from-white/30 to-transparent" />

                      {/* Fixed content rows — never overlap */}
                      <div className="relative z-[2] flex flex-col gap-2 px-3.5 py-3 sm:px-4">
                        <div className="flex items-start justify-between gap-3">
                          <p
                            className="text-[28px] font-black leading-none tracking-tight text-black md:text-[30px]"
                            style={{ textShadow: '0 1px 0 rgba(255,255,255,0.4)' }}
                          >
                            {layer.pct}%
                          </p>
                          <span className="shrink-0 rounded-md border border-black/20 bg-white/45 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-black/75">
                            {layer.short}
                          </span>
                        </div>

                        <p
                          className="truncate text-[12px] font-semibold leading-tight text-black/80 md:text-[13px]"
                          style={{ textShadow: '0 1px 0 rgba(255,255,255,0.28)' }}
                        >
                          {layer.label}
                          <span className="text-black/55"> · {layer.total} chill-outs</span>
                        </p>

                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {layer.segments.map((seg) => (
                            <span
                              key={seg.key}
                              className="inline-flex items-center gap-1 rounded-full border border-black/20 bg-black/10 px-2 py-0.5 text-[10px] font-bold text-black/85 backdrop-blur-[1px]"
                            >
                              <span
                                className="h-1.5 w-1.5 rounded-[2px] border border-black/30"
                                style={{ background: seg.color }}
                              />
                              {seg.name} {seg.value}
                            </span>
                          ))}
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
