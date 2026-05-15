'use client';

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  CHILLOUT_CHART_COLORS,
} from '@/lib/chartTheme';
import type { TrendPoint } from '@/lib/chartTrend';

interface TrendLineChartProps {
  data: TrendPoint[];
  height?: number;
  isAnimationActive?: boolean;
  ariaLabel: string;
}

function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg border border-white/15 px-3 py-2 text-sm shadow-lg"
      style={{ backgroundColor: 'rgba(26, 26, 46, 0.96)', color: '#fff' }}
    >
      <p className="font-semibold mb-1.5">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex justify-between gap-4 tabular-nums">
          <span style={{ color: p.color }}>{p.name}</span>
          <span>{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function TrendLineChart({
  data,
  height = 320,
  isAnimationActive = true,
  ariaLabel,
}: TrendLineChartProps) {
  const isWeekly = data.some((d) => d.isWeekly);
  const tickInterval = data.length > 12 ? Math.ceil(data.length / 10) : 0;

  return (
    <div role="img" aria-label={ariaLabel} style={{ width: '100%', minWidth: 0 }}>
      {isWeekly && (
        <p className="text-xs text-white/50 mb-3">
          Gegroepeerd per week — minder punten, duidelijker verloop
        </p>
      )}
      <ResponsiveContainer width="100%" height={height} minWidth={0}>
        <ComposedChart data={data} margin={{ top: 12, right: 16, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
          <XAxis
            dataKey="label"
            stroke="transparent"
            tick={CHART_AXIS_TICK}
            interval={tickInterval || 'preserveStartEnd'}
            minTickGap={48}
            angle={data.length > 8 ? -28 : 0}
            textAnchor={data.length > 8 ? 'end' : 'middle'}
            height={data.length > 8 ? 64 : 36}
          />
          <YAxis
            stroke="transparent"
            tick={CHART_AXIS_TICK}
            allowDecimals={false}
            width={36}
          />
          <Tooltip content={<TrendTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.15)' }} />
          <Legend
            wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', paddingTop: 8 }}
            iconType="line"
          />
          <Area
            type="monotone"
            dataKey="total"
            name="Totaal"
            stroke={CHILLOUT_CHART_COLORS.total}
            fill={CHILLOUT_CHART_COLORS.total}
            fillOpacity={0.12}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 0 }}
            isAnimationActive={isAnimationActive}
          />
          <Line
            type="monotone"
            dataKey="vr"
            name="VR"
            stroke={CHILLOUT_CHART_COLORS.vr}
            strokeWidth={1.75}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            isAnimationActive={isAnimationActive}
          />
          <Line
            type="monotone"
            dataKey="vl"
            name="VL"
            stroke={CHILLOUT_CHART_COLORS.vl}
            strokeWidth={1.75}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            isAnimationActive={isAnimationActive}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
