import { supabase, isSupabaseEnabled } from './supabase';
import type { Timetable, TimetableSlots } from '@/types';

const DAY_NAMES = ['Ma', 'Di', 'Wo', 'Do', 'Vr'];
const HOURS = [1, 2, 3, 4, 5, 6, 7];

export { DAY_NAMES, HOURS };

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

/** Laad alle roosters voor een jaar */
export async function loadTimetables(year: string): Promise<Timetable[]> {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from('timetables')
      .select('*')
      .eq('year', year)
      .order('klas', { ascending: true });

    if (error) {
      console.error('Error loading timetables:', error);
      return [];
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      year: row.year,
      klas: row.klas,
      slots: row.slots || {},
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(`chillapp_timetables_${year}`);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
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

  if (isSupabaseEnabled && supabase) {
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
    if (error) throw error;
    return;
  }

  if (typeof window === 'undefined') return;
  const all = await loadTimetables(timetable.year);
  const idx = all.findIndex((t) => t.id === id || t.klas === timetable.klas);
  if (idx >= 0) all[idx] = toSave;
  else all.push(toSave);
  localStorage.setItem(`chillapp_timetables_${timetable.year}`, JSON.stringify(all));
}

/** Verwijder rooster */
export async function deleteTimetable(id: string, year: string): Promise<void> {
  if (isSupabaseEnabled && supabase) {
    const { error } = await supabase.from('timetables').delete().eq('id', id);
    if (error) throw error;
    return;
  }

  if (typeof window === 'undefined') return;
  const all = await loadTimetables(year).then((t) => t.filter((x) => x.id !== id));
  localStorage.setItem(`chillapp_timetables_${year}`, JSON.stringify(all));
}

/** Haal alle jaren op die roosters hebben */
export async function getTimetableYears(): Promise<string[]> {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from('timetables')
      .select('year')
      .order('year', { ascending: false });
    if (error) return [];
    const years = [...new Set((data || []).map((r: any) => r.year))];
    return years;
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
