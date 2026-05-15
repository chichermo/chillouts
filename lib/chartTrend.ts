import { formatDateDisplay, getWeekNumber, getWeekStartDate, parseRecordDate } from './utils';

export type TrendPoint = {
  label: string;
  total: number;
  vr: number;
  vl: number;
  generic: number;
  isWeekly?: boolean;
};

type DayTotals = { total: number; vr: number; vl: number; generic: number };

/** Bouwt een leesbare trendreeks: dagelijks bij weinig punten, anders per week */
export function buildTrendSeries(
  byDayData: Record<string, DayTotals>,
  weeklyThreshold = 21
): TrendPoint[] {
  const dates = Object.keys(byDayData)
    .filter((d) => byDayData[d].total > 0)
    .sort();

  if (dates.length === 0) return [];

  if (dates.length <= weeklyThreshold) {
    return dates.map((date) => {
      const parsed = parseRecordDate(date);
      return {
        label: parsed ? formatDateDisplay(parsed) : date,
        ...byDayData[date],
        isWeekly: false,
      };
    });
  }

  const weeks = new Map<
    string,
    TrendPoint & { sortKey: string }
  >();

  for (const date of dates) {
    const parsed = parseRecordDate(date);
    if (!parsed) continue;
    const weekStart = getWeekStartDate(parsed);
    const sortKey = weekStart.toISOString().split('T')[0];
    const day = weekStart.getDate();
    const month = weekStart.toLocaleDateString('nl-NL', { month: 'short' });
    const weekNum = getWeekNumber(parsed);

    if (!weeks.has(sortKey)) {
      weeks.set(sortKey, {
        sortKey,
        label: `W${weekNum} · ${day} ${month}`,
        total: 0,
        vr: 0,
        vl: 0,
        generic: 0,
        isWeekly: true,
      });
    }
    const bucket = weeks.get(sortKey)!;
    const dayTotals = byDayData[date];
    bucket.total += dayTotals.total;
    bucket.vr += dayTotals.vr;
    bucket.vl += dayTotals.vl;
    bucket.generic += dayTotals.generic;
  }

  return Array.from(weeks.values())
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(({ sortKey: _sk, ...point }) => point);
}
