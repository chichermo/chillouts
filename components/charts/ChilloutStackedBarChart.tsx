'use client';

import { useId, useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BAR_TOP_RADIUS,
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  CHILLOUT_CHART_COLORS,
} from '@/lib/chartTheme';

export interface ChilloutBarPoint {
  label: string;
  vr: number;
  vl: number;
  generic: number;
}

interface ChilloutStackedBarChartProps {
  data: ChilloutBarPoint[];
  layout?: 'vertical' | 'horizontal';
  height?: number;
  ariaLabel: string;
  /** Jitter-like cascade: layers + columns animate in sequence */
  cascade?: boolean;
  isAnimationActive?: boolean;
}

type TipPayload = {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string;
  payload?: ChilloutBarPoint;
};

type BarShapeProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  index?: number;
  radius?: number | [number, number, number, number];
};

function CascadeTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  const total = row ? row.vr + row.vl + row.generic : payload.reduce((s, p) => s + (p.value || 0), 0);
  const colorFor = (dataKey?: string, fallback?: string) => {
    if (dataKey === 'vr') return CHILLOUT_CHART_COLORS.vr;
    if (dataKey === 'vl') return CHILLOUT_CHART_COLORS.vl;
    if (dataKey === 'generic') return CHILLOUT_CHART_COLORS.generic;
    return fallback || '#fff';
  };

  return (
    <div className="min-w-[148px] rounded-xl border border-white/15 bg-[#161622]/96 px-3.5 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-md">
      <p className="mb-2 text-[11px] font-semibold tracking-[0.14em] text-white/45 uppercase">
        {label}
      </p>
      <div className="space-y-1.5">
        {payload.map((entry) => {
          const color = colorFor(entry.dataKey, entry.color);
          return (
            <div key={String(entry.dataKey)} className="flex items-center justify-between gap-6 text-sm">
              <span className="inline-flex items-center gap-2 text-white/80">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: color, boxShadow: `0 0 10px ${color}` }}
                />
                {entry.name}
              </span>
              <span className="font-semibold tabular-nums text-white">{entry.value ?? 0}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2 text-xs">
        <span className="text-white/50">Totaal</span>
        <span className="font-bold tabular-nums text-white">{total}</span>
      </div>
    </div>
  );
}

function roundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  radius: [number, number, number, number]
) {
  const [tl, tr, br, bl] = radius.map((r) => Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2)));
  if (h < 0) {
    // horizontal layout can flip; keep simple rect
    return `M${x},${y}h${w}v${h}h${-w}Z`;
  }
  return [
    `M${x + bl},${y + h}`,
    `L${x + w - br},${y + h}`,
    `Q${x + w},${y + h} ${x + w},${y + h - br}`,
    `L${x + w},${y + tr}`,
    `Q${x + w},${y} ${x + w - tr},${y}`,
    `L${x + tl},${y}`,
    `Q${x},${y} ${x},${y + tl}`,
    `L${x},${y + h - bl}`,
    `Q${x},${y + h} ${x + bl},${y + h}`,
    'Z',
  ].join('');
}

function makeCascadeShape(
  seriesIndex: number,
  isVertical: boolean,
  radius: [number, number, number, number]
) {
  return function CascadeShape(props: BarShapeProps) {
    const x = props.x ?? 0;
    const y = props.y ?? 0;
    const width = props.width ?? 0;
    const height = props.height ?? 0;
    const fill = props.fill ?? '#fff';
    const index = props.index ?? 0;

    if (width <= 0 || height <= 0) return null;

    const delay = index * 0.08 + seriesIndex * 0.32;
    const origin = isVertical ? 'bottom center' : 'center left';
    const animName = isVertical ? 'cascadeBarY' : 'cascadeBarX';

    return (
      <path
        d={roundedRectPath(x, y, width, height, radius)}
        fill={fill}
        style={{
          transformOrigin: origin,
          transformBox: 'fill-box',
          animation: `${animName} 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s both`,
          filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.2))',
        }}
      />
    );
  };
}

export default function ChilloutStackedBarChart({
  data,
  layout = 'vertical',
  height = 300,
  ariaLabel,
  cascade = false,
  isAnimationActive = true,
}: ChilloutStackedBarChartProps) {
  const isVertical = layout === 'vertical';
  const gradId = useId().replace(/:/g, '');
  const useCascadeMotion = cascade && isAnimationActive;
  const animate = isAnimationActive && !cascade;

  const series = useMemo(
    () =>
      [
        { key: 'vr' as const, name: 'VR', color: CHILLOUT_CHART_COLORS.vr },
        { key: 'vl' as const, name: 'VL', color: CHILLOUT_CHART_COLORS.vl },
        { key: 'generic' as const, name: 'Chillouts', color: CHILLOUT_CHART_COLORS.generic },
      ] as const,
    []
  );

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={useCascadeMotion ? 'cascade-chart' : undefined}
      style={{ width: '100%', minWidth: 0 }}
    >
      {useCascadeMotion && (
        <style>{`
          @keyframes cascadeChartIn {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes cascadeBarY {
            from { transform: scaleY(0); opacity: 0.35; }
            to { transform: scaleY(1); opacity: 1; }
          }
          @keyframes cascadeBarX {
            from { transform: scaleX(0); opacity: 0.35; }
            to { transform: scaleX(1); opacity: 1; }
          }
          .cascade-chart {
            animation: cascadeChartIn 0.4s ease-out both;
          }
          .cascade-chart .recharts-legend-item {
            margin-right: 14px !important;
          }
        `}</style>
      )}

      <ResponsiveContainer width="100%" height={height} minWidth={0}>
        <BarChart
          data={data}
          layout={isVertical ? undefined : 'vertical'}
          margin={
            isVertical
              ? { top: cascade ? 16 : 8, right: 8, left: 0, bottom: cascade ? 4 : 0 }
              : { left: 10, right: 20, top: 10, bottom: 10 }
          }
          barCategoryGap={cascade ? (isVertical ? '28%' : '22%') : isVertical ? '22%' : '18%'}
        >
          {cascade && (
            <defs>
              {series.map((s) => (
                <linearGradient
                  key={s.key}
                  id={`${gradId}-${s.key}`}
                  x1="0"
                  y1={isVertical ? '1' : '0'}
                  x2={isVertical ? '0' : '1'}
                  y2={isVertical ? '0' : '1'}
                >
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.7} />
                  <stop offset="55%" stopColor={s.color} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={1} />
                </linearGradient>
              ))}
            </defs>
          )}

          <CartesianGrid
            strokeDasharray={cascade ? '4 8' : '3 3'}
            stroke={CHART_GRID_STROKE}
            vertical={!isVertical}
            horizontal={isVertical}
          />
          {isVertical ? (
            <>
              <XAxis
                dataKey="label"
                stroke="transparent"
                tick={CHART_AXIS_TICK}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                stroke="transparent"
                tick={CHART_AXIS_TICK}
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
              />
            </>
          ) : (
            <>
              <XAxis
                type="number"
                stroke="transparent"
                tick={CHART_AXIS_TICK}
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                dataKey="label"
                type="category"
                stroke="transparent"
                tick={CHART_AXIS_TICK}
                width={Math.min(200, Math.max(90, ...data.map((d) => d.label.length * 7)))}
                interval={0}
                axisLine={false}
                tickLine={false}
              />
            </>
          )}
          <Tooltip
            content={<CascadeTooltip />}
            cursor={{ fill: 'rgba(255,255,255,0.06)', radius: cascade ? 8 : 0 }}
          />
          <Legend
            wrapperStyle={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.85)',
              paddingTop: cascade ? 8 : 0,
            }}
            iconType={cascade ? 'circle' : 'rect'}
          />

          {series.map((s, seriesIndex) => {
            const isTop = seriesIndex === series.length - 1;
            const fill = cascade ? `url(#${gradId}-${s.key})` : s.color;
            const radius: [number, number, number, number] = isVertical
              ? isTop
                ? BAR_TOP_RADIUS
                : [0, 0, 0, 0]
              : isTop
                ? [0, 6, 6, 0]
                : [0, 0, 0, 0];

            return (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.name}
                stackId="a"
                fill={fill}
                radius={radius}
                maxBarSize={cascade ? (isVertical ? 44 : 24) : isVertical ? 40 : 22}
                isAnimationActive={animate}
                animationDuration={500}
                shape={
                  useCascadeMotion
                    ? makeCascadeShape(seriesIndex, isVertical, radius)
                    : undefined
                }
              />
            );
          })}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
