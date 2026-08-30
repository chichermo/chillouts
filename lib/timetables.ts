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

/** Schooljaar loopt van 1 sept t/m 30 juni (voor filters/backup). */
export function getSchoolYearDateRange(year: string): { from: string; to: string } | null {
  const match = /^(\d{4})-(\d{4})$/.exec(year.trim());
  if (!match) return null;
  const start = parseInt(match[1], 10);
  const end = parseInt(match[2], 10);
  if (end !== start + 1) return null;
  return {
    from: `${start}-09-01`,
    to: `${end}-06-30`,
  };
}

/** Afgesloten schooljaar: einddatum 30 juni is gepasseerd. */
export function isSchoolYearCompleted(year: string, now: Date = new Date()): boolean {
  const range = getSchoolYearDateRange(year);
  if (!range) return false;
  const end = new Date(`${range.to}T23:59:59`);
  return now.getTime() > end.getTime();
}

/** Unieke schooljaren uit datums, nieuwste eerst. */
export function listSchoolYearsFromDates(dates: string[]): string[] {
  const years = new Set<string>();
  for (const date of dates) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const parsed = new Date(`${date}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) continue;
    years.add(getSchoolYear(parsed));
  }
  return Array.from(years).sort().reverse();
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

/** Normaliseer klasnaam voor lookup (spaties, &, hoofdletters) */
export function normalizeKlasForLookup(klas: string): string {
  return klas
    .trim()
    .replace(/&/g, ' ')
    .replace(/[_./-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toUpperCase()
    .replace(/\s+/g, ''); // "3 Move & Play" / "3 MovePlay" → "3MOVEPLAY"
}

/** Indexeer roosters per klas + genormaliseerde sleutel */
export function indexTimetablesByKlas(timetables: Timetable[]): Record<string, Timetable> {
  const map: Record<string, Timetable> = {};
  for (const t of timetables) {
    map[t.klas] = t;
    map[normalizeKlasForLookup(t.klas)] = t;
  }
  return map;
}

/** Zoek rooster ongeacht spaties / hoofdletters / & in de klasnaam */
export function findTimetableInMap(
  map: Record<string, Timetable> | undefined,
  klas: string
): Timetable | undefined {
  if (!map || !klas) return undefined;
  if (map[klas]) return map[klas];
  const key = normalizeKlasForLookup(klas);
  if (map[key]) return map[key];
  for (const [k, t] of Object.entries(map)) {
    if (normalizeKlasForLookup(k) === key) return t;
  }
  return undefined;
}

/**
 * Kies roosters voor een datum: schooljaar van de datum, in juli/augustus
 * ook het aankomende schooljaar (meeste ingevulde slots wint).
 */
export async function loadTimetablesForDate(date: Date): Promise<{
  year: string;
  timetables: Timetable[];
  map: Record<string, Timetable>;
}> {
  const primaryYear = getSchoolYear(date);
  const calendarYear = date.getFullYear();
  const month = date.getMonth();
  const upcomingYear = `${calendarYear}-${calendarYear + 1}`;

  const candidates = new Set<string>([primaryYear]);
  // Juli/augustus: vaak al roosters voor het nieuwe schooljaar
  if (month === 6 || month === 7) {
    candidates.add(upcomingYear);
  }

  let bestYear = primaryYear;
  let best: Timetable[] = [];
  let bestFilled = -1;

  const consider = async (year: string) => {
    const list = await loadTimetables(year);
    const filled = list.reduce(
      (sum, t) =>
        sum + Object.values(t.slots || {}).filter((v) => v && String(v).trim()).length,
      0
    );
    if (filled > bestFilled) {
      bestFilled = filled;
      best = list;
      bestYear = year;
    }
  };

  for (const year of candidates) {
    await consider(year);
  }

  if (bestFilled <= 0) {
    try {
      const years = await getTimetableYears();
      for (const year of years) {
        if (candidates.has(year)) continue;
        await consider(year);
      }
    } catch {
      /* behoud wat we hebben */
    }
  }

  return {
    year: bestYear,
    timetables: best,
    map: indexTimetablesByKlas(best),
  };
}

/** Schooljaar van datum, daarna fallback naar andere jaren met rooster voor dezelfde klas */
export function resolveTimetableForKlas(
  mapByYear: Record<string, Record<string, Timetable>>,
  klas: string,
  recordDate: Date
): Timetable | undefined {
  const primaryYear = getSchoolYear(recordDate);
  const fromPrimary = findTimetableInMap(mapByYear[primaryYear], klas);
  if (fromPrimary) return fromPrimary;

  const years = Object.keys(mapByYear).sort().reverse();
  for (const year of years) {
    if (year === primaryYear) continue;
    const found = findTimetableInMap(mapByYear[year], klas);
    if (found) return found;
  }
  return undefined;
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
    if (startYear < 2018 || startYear > currentYear + 2) continue;
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

/** Verwijder rooster voor een klas in een schooljaar (op id én year+klas). */
export async function deleteTimetableForKlas(year: string, klas: string): Promise<void> {
  const client = requireSupabase();
  try {
    const id = timetableId(year, klas);
    const byId = await client.from('timetables').delete().eq('id', id);
    if (byId.error) throw byId.error;
    const byPair = await client
      .from('timetables')
      .delete()
      .eq('year', year)
      .eq('klas', klas);
    if (byPair.error) throw byPair.error;
  } catch (e) {
    throw wrapTimetablesError(e);
  }
}

/**
 * Hernoem een rooster-klas in één schooljaar (alleen timetables, niet students).
 * Bewaart slots; faalt als de nieuwe naam al bestaat.
 */
export async function renameTimetableKlas(
  year: string,
  oldKlas: string,
  newKlas: string
): Promise<string> {
  const from = String(oldKlas || '').trim().replace(/\s+/g, ' ');
  const to = String(newKlas || '').trim().replace(/\s+/g, ' ');
  if (!from) throw new Error('Oude klasnaam ontbreekt.');
  if (!to) throw new Error('Nieuwe klasnaam mag niet leeg zijn.');
  if (to === from) return to;

  const existing = await loadTimetables(year);
  if (existing.some((t) => t.klas === to)) {
    throw new Error(`Er bestaat al een rooster voor "${to}". Kies een andere naam.`);
  }

  const current = existing.find((t) => t.klas === from);
  await saveTimetable({
    id: timetableId(year, to),
    year,
    klas: to,
    slots: current?.slots || {},
  });
  await deleteTimetableForKlas(year, from);
  return to;
}

/** Haal schooljaren op die roosters hebben in Supabase */
/** Maak lege rooster-rijen aan voor alle klassen (slots invullen in UI) */
export async function seedTimetablesForKlassen(
  year: string,
  klassen: string[]
): Promise<{ created: number; skipped: number }> {
  const existing = await loadTimetables(year);
  const existingKlassen = new Set(existing.map((t) => t.klas));
  let created = 0;
  let skipped = 0;

  for (const klas of klassen) {
    if (!klas.trim()) continue;
    if (existingKlassen.has(klas)) {
      skipped++;
      continue;
    }
    await saveTimetable({
      id: timetableId(year, klas),
      year,
      klas,
      slots: {},
    });
    created++;
  }

  return { created, skipped };
}

export async function countFilledTimetableSlots(timetable: Timetable): Promise<number> {
  return Object.values(timetable.slots || {}).filter((v) => v && String(v).trim()).length;
}

/** Wis alle docentennamen (slots) voor een schooljaar; rooster-rijen blijven bestaan. */
export async function clearAllTimetableSlots(year: string): Promise<number> {
  const client = requireSupabase();
  const timetables = await loadTimetables(year);
  if (timetables.length === 0) return 0;

  const updatedAt = new Date().toISOString();
  for (const timetable of timetables) {
    const { error } = await client
      .from('timetables')
      .update({ slots: {}, updated_at: updatedAt })
      .eq('id', timetable.id);
    if (error) throw wrapTimetablesError(error);
  }
  return timetables.length;
}

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
