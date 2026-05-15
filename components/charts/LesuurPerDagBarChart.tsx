'use client';

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
  CHART_TOOLTIP_STYLE,
  LESUUR_COLORS,
  LESUUR_HOURS,
} from '@/lib/chartTheme';

export type DayHourChartPoint = {
  date: string;
  [key: string]: string | number;
};

interface LesuurPerDagBarChartProps {
  data: DayHourChartPoint[];
  isAnimationActive?: boolean;
  compact?: boolean;
  ariaLabel?: string;
}

type TooltipPayload = {
  dataKey?: string | number;
  value?: number;
  color?: string;
};

function LesuurPerDagTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const rows = payload
    .filter((p) => typeof p.value === 'number' && p.value > 0)
    .sort((a, b) => Number(a.dataKey) - Number(b.dataKey));

  if (rows.length === 0) return null;

  const total = rows.reduce((sum, p) => sum + (p.value ?? 0), 0);

  return (
    <div style={CHART_TOOLTIP_STYLE} className="text-sm">
      <p className="font-semibold mb-2 text-white/95">{label}</p>
      <div className="space-y-1">
        {rows.map((p) => (
          <div key={String(p.dataKey)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-white/85">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: p.color }}
              />
              Lesuur {p.dataKey}
            </span>
            <span className="font-semibold tabular-nums">{p.value}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 pt-2 border-t border-white/15 text-white/70 text-xs">
        Totaal: <span className="font-semibold text-white">{total}</span>
      </p>
    </div>
  );
}

export default function LesuurPerDagBarChart({
  data,
  isAnimationActive = true,
  compact = false,
  ariaLabel = 'Grafiek chill-outs per lesuur per dag',
}: LesuurPerDagBarChartProps) {
  const manyDates = data.length > 10;
  const scrollMinWidth = data.length * 52 + 80;
  const chartHeight = compact ? 300 : manyDates ? 400 : 360;
  const maxBarSize = compact ? 18 : manyDates ? 22 : 32;

  const chart = (
    <BarChart
      data={data}
      margin={{ top: 8, right: 12, left: 4, bottom: compact ? 56 : 72 }}
      barCategoryGap={compact ? '12%' : '20%'}
      barGap={compact ? 1 : 2}
    >
      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
      <XAxis
        dataKey="date"
        stroke="transparent"
        tick={CHART_AXIS_TICK}
        angle={manyDates && !compact ? -40 : -25}
        textAnchor="end"
        height={compact ? 56 : 72}
        interval={0}
      />
      <YAxis stroke="transparent" tick={CHART_AXIS_TICK} allowDecimals={false} width={36} />
      <Tooltip content={<LesuurPerDagTooltip />} cursor={{ fill: 'rgba(255,255,255,0.06)', radius: 4 }} />
      <Legend
        wrapperStyle={{ paddingTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.85)' }}
        iconType="circle"
        iconSize={8}
      />
      {LESUUR_HOURS.map((hour) => (
        <Bar
          key={hour}
          dataKey={String(hour)}
          name={`Lesuur ${hour}`}
          fill={LESUUR_COLORS[hour]}
          radius={BAR_TOP_RADIUS}
          maxBarSize={maxBarSize}
          isAnimationActive={isAnimationActive}
        />
      ))}
    </BarChart>
  );

  const chartWidth = compact || !manyDates ? '100%' : scrollMinWidth;

  const inner = (
    <div
      className={manyDates && !compact ? 'w-full overflow-x-auto pb-1 scrollbar-hide' : undefined}
      style={{ width: '100%', minWidth: 0 }}
    >
      <ResponsiveContainer width={chartWidth} height={chartHeight} minWidth={0}>
        {chart}
      </ResponsiveContainer>
    </div>
  );


  return (
    <div role="img" aria-label={ariaLabel}>
      {inner}
    </div>
  );
}
