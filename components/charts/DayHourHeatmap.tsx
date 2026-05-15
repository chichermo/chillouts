'use client';

import { LESUUR_HOURS } from '@/lib/chartTheme';
import type { DayHourChartPoint } from './LesuurPerDagBarChart';

interface DayHourHeatmapProps {
  data: DayHourChartPoint[];
  title?: string;
}

function cellColor(value: number, max: number): string {
  if (value <= 0 || max <= 0) return 'rgba(255,255,255,0.06)';
  const t = Math.min(1, value / max);
  const r = Math.round(96 + t * 120);
  const g = Math.round(80 + t * 40);
  const b = Math.round(180 - t * 60);
  const a = 0.35 + t * 0.55;
  return `rgba(${r},${g},${b},${a})`;
}

export default function DayHourHeatmap({ data, title }: DayHourHeatmapProps) {
  const max = data.reduce((m, row) => {
    const rowMax = LESUUR_HOURS.reduce(
      (h, hour) => Math.max(h, Number(row[String(hour)] || 0)),
      0
    );
    return Math.max(m, rowMax);
  }, 0);

  if (data.length === 0) return null;

  const summary = `${data.length} dagen, max ${max} chill-outs per lesuur`;

  return (
    <div
      role="img"
      aria-label={title ? `${title}. ${summary}` : `Heatmap dag en lesuur. ${summary}`}
    >
      <div className="overflow-x-auto pb-1">
        <table className="w-full border-collapse text-xs min-w-[480px]">
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-20 bg-[#2a2a3a] px-2 py-2 text-left font-semibold text-white/80 border-b border-white/15"
              >
                Dag
              </th>
              {LESUUR_HOURS.map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="px-2 py-2 text-center font-semibold text-white/80 border-b border-white/15 min-w-[44px]"
                >
                  L{h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.date} className="border-b border-white/5">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-[#2a2a3a]/98 px-2 py-1.5 text-left font-medium text-white whitespace-nowrap border-r border-white/10"
                >
                  {row.date}
                </th>
                {LESUUR_HOURS.map((hour) => {
                  const value = Number(row[String(hour)] || 0);
                  return (
                    <td key={hour} className="p-0.5">
                      <div
                        className="flex h-9 min-w-[40px] items-center justify-center rounded-md text-[11px] font-semibold tabular-nums transition-colors"
                        style={{
                          backgroundColor: cellColor(value, max),
                          color: value > 0 ? '#fff' : 'rgba(255,255,255,0.35)',
                        }}
                        title={`${row.date}, lesuur ${hour}: ${value} chill-outs`}
                        aria-label={`${row.date}, lesuur ${hour}, ${value}`}
                      >
                        {value > 0 ? value : '·'}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-white/50" aria-hidden="true">
        <span>Laag</span>
        <div className="h-2 flex-1 max-w-[120px] rounded-full bg-gradient-to-r from-white/10 via-indigo-400/60 to-indigo-300" />
        <span>Hoog ({max})</span>
      </div>
    </div>
  );
}
