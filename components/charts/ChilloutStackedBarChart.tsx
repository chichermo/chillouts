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
  dataKey?: string;
}

export default function ChilloutStackedBarChart({
  data,
  layout = 'vertical',
  height = 300,
  ariaLabel,
}: ChilloutStackedBarChartProps) {
  const isVertical = layout === 'vertical';

  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout={isVertical ? undefined : 'vertical'}
          margin={
            isVertical
              ? { top: 8, right: 8, left: 0, bottom: 0 }
              : { left: 10, right: 20, top: 10, bottom: 10 }
          }
          barCategoryGap={isVertical ? '22%' : '18%'}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={CHART_GRID_STROKE}
            vertical={!isVertical}
            horizontal={isVertical}
          />
          {isVertical ? (
            <>
              <XAxis dataKey="label" stroke="transparent" tick={CHART_AXIS_TICK} />
              <YAxis stroke="transparent" tick={CHART_AXIS_TICK} allowDecimals={false} />
            </>
          ) : (
            <>
              <XAxis type="number" stroke="transparent" tick={CHART_AXIS_TICK} allowDecimals={false} />
              <YAxis
                dataKey="label"
                type="category"
                stroke="transparent"
                tick={CHART_AXIS_TICK}
                width={Math.min(200, Math.max(90, ...data.map((d) => d.label.length * 7)))}
                interval={0}
              />
            </>
          )}
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.06)' }} />
          <Legend wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }} />
          <Bar
            dataKey="vr"
            name="VR"
            stackId="a"
            fill={CHILLOUT_CHART_COLORS.vr}
            radius={isVertical ? [0, 0, 0, 0] : [0, 0, 0, 0]}
            maxBarSize={isVertical ? 40 : 22}
          />
          <Bar
            dataKey="vl"
            name="VL"
            stackId="a"
            fill={CHILLOUT_CHART_COLORS.vl}
            maxBarSize={isVertical ? 40 : 22}
          />
          <Bar
            dataKey="generic"
            name="Chillouts"
            stackId="a"
            fill={CHILLOUT_CHART_COLORS.generic}
            radius={isVertical ? BAR_TOP_RADIUS : [0, 6, 6, 0]}
            maxBarSize={isVertical ? 40 : 22}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
