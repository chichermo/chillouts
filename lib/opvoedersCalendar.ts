import { getAppSetting, setAppSetting } from './app-settings';

export type LessonPeriod = {
  id: number;
  label: string;
};

export const LESSON_PERIODS: LessonPeriod[] = [
  { id: 1, label: '9:00 – 9:50' },
  { id: 2, label: '9:50 – 10:40' },
  { id: 3, label: '10:50 – 11:40' },
  { id: 4, label: '11:40 – 12:30' },
  { id: 5, label: '13:20 – 14:10' },
  { id: 6, label: '14:10 – 15:00' },
  { id: 7, label: '15:10 – 16:00' },
];

const WEEKDAYS = ['ma', 'di', 'wo', 'do', 'vr'] as const;

export type OpvoedersCalendar = {
  remarks: Record<string, string>;
  weeks: Record<string, string>;
  /** Eén tekst voor het zijvenster, op elke week dezelfde. */
  note: string;
};

const STORAGE_KEY = 'opvoeders_calendar';

export function remarkKey(dayKey: string, lessonId: number) {
  return `${dayKey}:${lessonId}`;
}

export function brusselsTodayKey(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Brussels',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function utcDate(dayKey: string) {
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDays(dayKey: string, days: number): string {
  const date = utcDate(dayKey);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function mondayKey(dayKey: string): string {
  const date = utcDate(dayKey);
  const weekday = date.getUTCDay();
  const delta = weekday === 0 ? -6 : 1 - weekday;
  return addDays(dayKey, delta);
}

export function weekDayKeys(monday: string): string[] {
  return WEEKDAYS.map((_, index) => addDays(monday, index));
}

export function weekdayLabel(index: number): string {
  return WEEKDAYS[index] ?? '';
}

export function formatDayNumber(dayKey: string): string {
  return String(utcDate(dayKey).getUTCDate());
}

export function formatWeekRange(monday: string): string {
  const friday = addDays(monday, 4);
  const start = new Intl.DateTimeFormat('nl-BE', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(utcDate(monday));
  const end = new Intl.DateTimeFormat('nl-BE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(utcDate(friday));
  return `${start} – ${end}`;
}

function compactNote(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

/** Langste weektekst, zonder kortere stukken die er al in staan. */
export function noteFromWeeks(weeks: Record<string, string>): string {
  const bodies = Object.values(weeks).filter((value) => value.trim());
  bodies.sort((a, b) => b.length - a.length);
  const kept: string[] = [];
  for (const body of bodies) {
    const folded = compactNote(body);
    if (kept.some((item) => compactNote(item).includes(folded))) continue;
    const covering = kept.findIndex((item) => folded.includes(compactNote(item)));
    if (covering >= 0) {
      kept[covering] = body;
      continue;
    }
    kept.push(body);
  }
  return kept.join('\n\n');
}

export async function loadOpvoedersCalendar(): Promise<OpvoedersCalendar> {
  const stored = await getAppSetting<Partial<OpvoedersCalendar>>(STORAGE_KEY);
  const remarks = stored?.remarks && typeof stored.remarks === 'object' ? stored.remarks : {};
  const weeks = stored?.weeks && typeof stored.weeks === 'object' ? stored.weeks : {};
  const note = typeof stored?.note === 'string' ? stored.note : noteFromWeeks(weeks);
  return { remarks, weeks, note };
}

export async function saveOpvoedersCalendar(data: OpvoedersCalendar): Promise<void> {
  await setAppSetting(STORAGE_KEY, data);
}
