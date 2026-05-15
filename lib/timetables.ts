import { supabase, isSupabaseEnabled } from './supabase';
import type { Timetable, TimetableSlots } from '@/types';

const DAY_NAMES = ['Ma', 'Di', 'Wo', 'Do', 'Vr'];
const HOURS = [1, 2, 3, 4, 5, 6, 7];
const UNAVAILABLE_KEY = 'chillapp_timetables_no_supabase';

export { DAY_NAMES, HOURS };

/** Na eerste 404 geen Supabase-calls meer voor timetables deze sessie */
let timetablesSupabaseAvailable: boolean | null = null;
let timetablesProbePromise: Promise<boolean> | null = null;

function readCachedUnavailable(): boolean {
  if (timetablesSupabaseAvailable === false) return true;
  if (typeof window !== 'undefined' && sessionStorage.getItem(UNAVAILABLE_KEY) === '1') {
    timetablesSupabaseAvailable = false;
    return true;
  }
  return false;
}

function markTimetablesUnavailable(): void {
  timetablesSupabaseAvailable = false;
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(UNAVAILABLE_KEY, '1');
  }
}

function isMissingTableError(error: {
  code?: string;
  message?: string;
  details?: string;
  status?: number;
  statusCode?: number;
} | null): boolean {
  if (!error) return false;
  const code = String(error.code || '');
  const msg = String(error.message || '').toLowerCase();
  const details = String(error.details || '').toLowerCase();
  const status = Number(error.status ?? error.statusCode ?? 0);
  return (
    status === 404 ||
    code === 'PGRST205' ||
    code === 'PGRST204' ||
    code === 'PGRST116' ||
    code === '42P01' ||
    msg.includes('does not exist') ||
    msg.includes('not found') ||
    msg.includes('relation') ||
    details.includes('does not exist') ||
    msg.includes('404')
  );
}

/** Eén probe per sessie — voorkomt meerdere 404's in de console */
async function ensureTimetablesSupabase(): Promise<boolean> {
  if (readCachedUnavailable()) return false;
  if (timetablesSupabaseAvailable === true) return true;
  if (!isSupabaseEnabled || !supabase) return false;

  if (!timetablesProbePromise) {
    timetablesProbePromise = (async () => {
      const { error } = await supabase!
        .from('timetables')
        .select('id')
        .limit(1);

      if (!error) {
        timetablesSupabaseAvailable = true;
        return true;
      }
      if (isMissingTableError(error)) {
        markTimetablesUnavailable();
      }
      return false;
    })();
  }

  return timetablesProbePromise;
}

/** Bepaal schooljaar voor een datum (bv. sept 2025 = 2025-2026) */
export function getSchoolYear(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0-11
  if (m >= 8) return `${y}-${y + 1}`;
  return `${y - 1}-${y}`;
}

/** Maak slot key: dayIndex (0=Ma) + hour (1-7) */
export function slotKey(dayIndex: number, hour: number): string {
  return `${dayIndex}_${hour}`;
}

/** Geef dayIndex (0-4) voor een datum: Ma=0, Di=1, Wo=2, Do=3, Vr=4 */
export function getDayIndex(date: Date): number {
  const d = date.getDay(); // 0=Zo, 1=Ma, ..., 5=Vr
  if (d === 0) return -1; // Zondag
  return d - 1; // Ma=0, Di=1, ...
}

/** Haal docent op voor klas, dag en lesuur */
export function getTeacherForSlot(
  slots: TimetableSlots,
  date: Date,
  hour: number
): string {
  const dayIndex = getDayIndex(date);
  if (dayIndex < 0) return '';
  const key = slotKey(dayIndex, hour);
  return slots[key] || '';
}

function loadTimetablesFromLocalStorage(year: string): Timetable[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(`chillapp_timetables_${year}`);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Schooljaren die in de daily records voorkomen (optioneel binnen datumfilter) */
export function getSchoolYearsFromDates(
  recordDates: string[],
  dateFrom?: string,
  dateTo?: string
): string[] {
  const years = new Set<string>();
  const currentYear = new Date().getFullYear();
  for (const date of recordDates) {
    if (dateFrom && date < dateFrom) continue;
    if (dateTo && date > dateTo) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const parsed = new Date(`${date}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) continue;
    const schoolYear = getSchoolYear(parsed);
    const startYear = parseInt(schoolYear.split('-')[0], 10);
    if (startYear < 2018 || startYear > currentYear + 1) continue;
    years.add(schoolYear);
  }
  if (years.size === 0) {
    years.add(getSchoolYear(new Date()));
  }
  return Array.from(years).sort();
}

/** Laad alle roosters voor een jaar */
export async function loadTimetables(year: string): Promise<Timetable[]> {
  if (readCachedUnavailable()) {
    return loadTimetablesFromLocalStorage(year);
  }

  const canUseSupabase = await ensureTimetablesSupabase();
  if (!canUseSupabase || !supabase) {
    return loadTimetablesFromLocalStorage(year);
  }

  const { data, error } = await supabase
    .from('timetables')
    .select('*')
    .eq('year', year)
    .order('klas', { ascending: true });

  if (!error) {
    return (data || []).map((row: {
      id: string;
      year: string;
      klas: string;
      slots?: TimetableSlots;
      created_at?: string;
      updated_at?: string;
    }) => ({
      id: row.id,
      year: row.year,
      klas: row.klas,
      slots: row.slots || {},
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  if (isMissingTableError(error)) {
    markTimetablesUnavailable();
  }
  return loadTimetablesFromLocalStorage(year);
}

/** Laad één rooster voor klas en jaar */
export async function loadTimetable(
  year: string,
  klas: string
): Promise<Timetable | null> {
  const all = await loadTimetables(year);
  return all.find((t) => t.klas === klas) || null;
}

/** Genereer id voor rooster */
export function timetableId(year: string, klas: string): string {
  return `timetable_${year}_${klas.replace(/\s+/g, '_')}`;
}

/** Sla rooster op */
export async function saveTimetable(timetable: Timetable): Promise<void> {
  const id = timetable.id || timetableId(timetable.year, timetable.klas);
  const toSave = { ...timetable, id };

  if (!readCachedUnavailable() && isSupabaseEnabled && supabase) {
    const available = await ensureTimetablesSupabase();
    if (available) {
      const { error } = await supabase.from('timetables').upsert(
        {
          id,
          year: toSave.year,
          klas: toSave.klas,
          slots: toSave.slots,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'year,klas' }
      );
      if (!error) return;
      if (isMissingTableError(error)) markTimetablesUnavailable();
    }
  }

  if (typeof window === 'undefined') return;
  const all = loadTimetablesFromLocalStorage(timetable.year);
  const idx = all.findIndex((t) => t.id === id || t.klas === timetable.klas);
  if (idx >= 0) all[idx] = toSave;
  else all.push(toSave);
  localStorage.setItem(`chillapp_timetables_${timetable.year}`, JSON.stringify(all));
}

/** Verwijder rooster */
export async function deleteTimetable(id: string, year: string): Promise<void> {
  if (!readCachedUnavailable() && isSupabaseEnabled && supabase) {
    const available = await ensureTimetablesSupabase();
    if (available) {
      const { error } = await supabase.from('timetables').delete().eq('id', id);
      if (!error) return;
      if (isMissingTableError(error)) markTimetablesUnavailable();
    }
  }

  if (typeof window === 'undefined') return;
  const all = await loadTimetables(year).then((t) => t.filter((x) => x.id !== id));
  localStorage.setItem(`chillapp_timetables_${year}`, JSON.stringify(all));
}

/** Haal alle jaren op die roosters hebben */
export async function getTimetableYears(): Promise<string[]> {
  if (!readCachedUnavailable() && isSupabaseEnabled && supabase) {
    const available = await ensureTimetablesSupabase();
    if (available) {
      const { data, error } = await supabase
        .from('timetables')
        .select('year')
        .order('year', { ascending: false });
      if (!error) {
        const years = [...new Set((data || []).map((r: { year: string }) => r.year))];
        if (years.length > 0) return years;
      } else if (isMissingTableError(error)) {
        markTimetablesUnavailable();
      }
    }
  }

  if (typeof window === 'undefined') return [];
  const keys = Object.keys(localStorage).filter((k) =>
    k.startsWith('chillapp_timetables_')
  );
  return keys
    .map((k) => k.replace('chillapp_timetables_', ''))
    .filter(Boolean)
    .sort()
    .reverse();
}
