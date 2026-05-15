import { supabase, isSupabaseEnabled } from './supabase';
import type { Timetable, TimetableSlots } from '@/types';

const DAY_NAMES = ['Ma', 'Di', 'Wo', 'Do', 'Vr'];
const HOURS = [1, 2, 3, 4, 5, 6, 7];

export { DAY_NAMES, HOURS };

const TIMETABLES_SETUP_HINT =
  'Voer supabase/timetables_schema.sql uit in de Supabase SQL Editor.';

function requireSupabase() {
  if (!isSupabaseEnabled || !supabase) {
    throw new Error(
      'Supabase is niet geconfigureerd. Zet NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.'
    );
  }
  return supabase;
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
    details.includes('does not exist')
  );
}

function wrapTimetablesError(error: unknown): Error {
  if (error && typeof error === 'object' && isMissingTableError(error as { code?: string })) {
    return new Error(`Tabel "timetables" ontbreekt in Supabase. ${TIMETABLES_SETUP_HINT}`);
  }
  if (error instanceof Error) return error;
  return new Error('Fout bij laden van roosters uit Supabase.');
}

function mapRow(row: {
  id: string;
  year: string;
  klas: string;
  slots?: TimetableSlots;
  created_at?: string;
  updated_at?: string;
}): Timetable {
  return {
    id: row.id,
    year: row.year,
    klas: row.klas,
    slots: row.slots || {},
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** Bepaal schooljaar voor een datum (bv. sept 2025 = 2025-2026) */
export function getSchoolYear(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth();
  if (m >= 8) return `${y}-${y + 1}`;
  return `${y - 1}-${y}`;
}

export function slotKey(dayIndex: number, hour: number): string {
  return `${dayIndex}_${hour}`;
}

export function getDayIndex(date: Date): number {
  const d = date.getDay();
  if (d === 0) return -1;
  return d - 1;
}

export function getTeacherForSlot(
  slots: TimetableSlots,
  date: Date,
  hour: number
): string {
  const dayIndex = getDayIndex(date);
  if (dayIndex < 0) return '';
  return slots[slotKey(dayIndex, hour)] || '';
}

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

/** Laad alle roosters voor een jaar (alleen Supabase) */
export async function loadTimetables(year: string): Promise<Timetable[]> {
  const client = requireSupabase();
  try {
    const { data, error } = await client
      .from('timetables')
      .select('*')
      .eq('year', year)
      .order('klas', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapRow);
  } catch (e) {
    throw wrapTimetablesError(e);
  }
}

export async function loadTimetable(
  year: string,
  klas: string
): Promise<Timetable | null> {
  const all = await loadTimetables(year);
  return all.find((t) => t.klas === klas) || null;
}

export function timetableId(year: string, klas: string): string {
  return `timetable_${year}_${klas.replace(/\s+/g, '_')}`;
}

/** Sla rooster op in Supabase */
export async function saveTimetable(timetable: Timetable): Promise<void> {
  const client = requireSupabase();
  const id = timetable.id || timetableId(timetable.year, timetable.klas);
  try {
    const { error } = await client.from('timetables').upsert(
      {
        id,
        year: timetable.year,
        klas: timetable.klas,
        slots: timetable.slots,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'year,klas' }
    );
    if (error) throw error;
  } catch (e) {
    throw wrapTimetablesError(e);
  }
}

export async function deleteTimetable(id: string): Promise<void> {
  const client = requireSupabase();
  try {
    const { error } = await client.from('timetables').delete().eq('id', id);
    if (error) throw error;
  } catch (e) {
    throw wrapTimetablesError(e);
  }
}

/** Haal schooljaren op die roosters hebben in Supabase */
export async function getTimetableYears(): Promise<string[]> {
  const client = requireSupabase();
  try {
    const { data, error } = await client
      .from('timetables')
      .select('year')
      .order('year', { ascending: false });

    if (error) throw error;
    const years = [...new Set((data || []).map((r: { year: string }) => r.year))];
    return years.sort().reverse();
  } catch (e) {
    throw wrapTimetablesError(e);
  }
}
