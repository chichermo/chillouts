import { supabase, isSupabaseEnabled } from './supabase';
import { countChillOutsInRecord, countChillOutsInStudentEntries, getHourSlot } from './utils';
import { getAppSetting, setAppSetting } from './app-settings';
import {
  getSchoolYear,
  getSchoolYearDateRange,
  isSchoolYearCompleted,
  loadTimetables,
} from './timetables';
import type { DailyRecord, Student, Timetable } from '@/types';

export type SchoolYearArchive = {
  year: string;
  from_date: string;
  to_date: string;
  archived_at: string;
  archived_by?: string | null;
  students_count: number;
  records_count: number;
  chillouts_total: number;
  students: Student[];
  daily_records: Record<string, DailyRecord>;
  timetables: Timetable[];
  meta?: Record<string, unknown>;
};

export type ArchiveResult = {
  year: string;
  studentsCount: number;
  recordsCount: number;
  chilloutsTotal: number;
  purgedRecords: number;
  purgedStudents: number;
  storage: 'table' | 'app_settings';
};

const SETTINGS_PREFIX = 'year_archive:';

function requireSupabase() {
  if (!isSupabaseEnabled || !supabase) {
    throw new Error(
      'Supabase is niet geconfigureerd. Zet NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }
  return supabase;
}

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const code = String(error.code || '');
  const msg = String(error.message || '').toLowerCase();
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.includes('does not exist') ||
    msg.includes('could not find the table') ||
    msg.includes('schema cache')
  );
}

function settingsKey(year: string) {
  return `${SETTINGS_PREFIX}${year}`;
}

async function loadAllDailyRecords(): Promise<DailyRecord[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('daily_records')
    .select('*')
    .order('date', { ascending: true });
  if (error) throw error;
  return (data || []).map((row) => ({
    date: row.date,
    dayName: row.day_name,
    entries: row.entries || {},
  }));
}

async function loadAllStudents(): Promise<Student[]> {
  const client = requireSupabase();
  const { data, error } = await client.from('students').select('*').order('klas');
  if (error) throw error;
  return (data || []) as Student[];
}

async function saveArchiveToTable(
  archive: SchoolYearArchive,
  force = false
): Promise<boolean> {
  const client = requireSupabase();
  if (!force) {
    const { data: existing, error: findErr } = await client
      .from('school_year_archives')
      .select('year')
      .eq('year', archive.year)
      .maybeSingle();
    if (findErr && !isMissingTableError(findErr)) throw findErr;
    if (existing) {
      throw new Error(
        `Archief ${archive.year} is onwijzigbaar en bestaat al. Overschrijven is niet toegestaan.`
      );
    }
  }

  const row = {
    year: archive.year,
    from_date: archive.from_date,
    to_date: archive.to_date,
    archived_at: archive.archived_at,
    archived_by: archive.archived_by || null,
    students_count: archive.students_count,
    records_count: archive.records_count,
    chillouts_total: archive.chillouts_total,
    students: archive.students,
    daily_records: archive.daily_records,
    timetables: archive.timetables,
    meta: { ...(archive.meta || {}), immutable: true, readonly: true },
  };

  const { error } = force
    ? await client.from('school_year_archives').upsert(row, { onConflict: 'year' })
    : await client.from('school_year_archives').insert(row);

  if (error) {
    if (isMissingTableError(error)) return false;
    throw error;
  }

  // Optionele genormaliseerde tabellen (voor snelle consultatie)
  await syncNormalizedArchiveTables(archive).catch(() => undefined);
  return true;
}

async function saveArchiveToSettings(
  archive: SchoolYearArchive,
  force = false
): Promise<void> {
  const key = settingsKey(archive.year);
  if (!force) {
    const existing = await getAppSetting<SchoolYearArchive>(key);
    if (existing) {
      throw new Error(
        `Archief ${archive.year} is onwijzigbaar en bestaat al. Overschrijven is niet toegestaan.`
      );
    }
  }
  await setAppSetting(key, {
    ...archive,
    meta: { ...(archive.meta || {}), immutable: true, readonly: true },
  });
  await syncNormalizedArchiveTables(archive).catch(() => undefined);
}

/** Schrijf rijen naar archived_students / archived_daily_records als die tabellen bestaan. */
async function syncNormalizedArchiveTables(archive: SchoolYearArchive): Promise<void> {
  const client = requireSupabase();

  const studentRows = archive.students.map((s) => ({
    year: archive.year,
    student_id: s.id,
    name: s.name,
    klas: s.klas,
    status: s.status,
  }));

  if (studentRows.length) {
    const { error } = await client.from('archived_students').upsert(studentRows, {
      onConflict: 'year,student_id',
    });
    if (error && !isMissingTableError(error)) throw error;
  }

  const recordRows = Object.values(archive.daily_records).map((r) => ({
    year: archive.year,
    date: r.date,
    day_name: r.dayName,
    entries: r.entries,
  }));

  if (recordRows.length) {
    const chunk = 40;
    for (let i = 0; i < recordRows.length; i += chunk) {
      const slice = recordRows.slice(i, i + chunk);
      const { error } = await client.from('archived_daily_records').upsert(slice, {
        onConflict: 'year,date',
      });
      if (error && !isMissingTableError(error)) throw error;
    }
  }
}

async function listArchivesFromTable(): Promise<SchoolYearArchive[] | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('school_year_archives')
    .select('*')
    .order('year', { ascending: false });
  if (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }
  return (data || []) as SchoolYearArchive[];
}

async function getArchiveFromTable(year: string): Promise<SchoolYearArchive | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('school_year_archives')
    .select('*')
    .eq('year', year)
    .maybeSingle();
  if (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }
  return (data as SchoolYearArchive) || null;
}

/** Lijst van gearchiveerde schooljaren (nieuwste eerst). */
export async function listArchivedSchoolYears(): Promise<
  Array<Pick<SchoolYearArchive, 'year' | 'from_date' | 'to_date' | 'archived_at' | 'students_count' | 'records_count' | 'chillouts_total'>>
> {
  const fromTable = await listArchivesFromTable();
  if (fromTable) {
    return fromTable.map((a) => ({
      year: a.year,
      from_date: a.from_date,
      to_date: a.to_date,
      archived_at: a.archived_at,
      students_count: a.students_count,
      records_count: a.records_count,
      chillouts_total: a.chillouts_total,
    }));
  }

  // Fallback: scan app_settings keys via known years is hard; try common pattern by loading settings list
  const client = requireSupabase();
  const { data, error } = await client.from('app_settings').select('key,value');
  if (error) throw error;
  const archives: SchoolYearArchive[] = [];
  for (const row of data || []) {
    if (!String(row.key).startsWith(SETTINGS_PREFIX)) continue;
    const value = row.value as SchoolYearArchive;
    if (value?.year) archives.push(value);
  }
  return archives
    .sort((a, b) => b.year.localeCompare(a.year))
    .map((a) => ({
      year: a.year,
      from_date: a.from_date,
      to_date: a.to_date,
      archived_at: a.archived_at,
      students_count: a.students_count,
      records_count: a.records_count,
      chillouts_total: a.chillouts_total,
    }));
}

export async function getSchoolYearArchive(year: string): Promise<SchoolYearArchive | null> {
  const fromTable = await getArchiveFromTable(year);
  if (fromTable) return fromTable;
  return getAppSetting<SchoolYearArchive>(settingsKey(year));
}

export async function isSchoolYearArchived(year: string): Promise<boolean> {
  const archive = await getSchoolYearArchive(year);
  return !!archive;
}

/**
 * Archiveert een afgesloten schooljaar en ruimt actieve data op:
 * - snapshot studenten + daily_records (+ roosters van dat jaar)
 * - verwijdert daily_records in de periode
 * - verwijdert studentenlijst (zit in het archief)
 * Gebruikers blijven onaangeroerd.
 */
export async function archiveAndPurgeSchoolYear(
  year: string,
  options?: { archivedBy?: string; force?: boolean }
): Promise<ArchiveResult> {
  const range = getSchoolYearDateRange(year);
  if (!range) throw new Error(`Ongeldig schooljaar: ${year}`);

  if (!options?.force && !isSchoolYearCompleted(year)) {
    throw new Error(
      `Schooljaar ${year} is nog niet afgelopen (eindigt op ${range.to}). Archiveren kan pas na 30 juni.`
    );
  }

  const existing = await getSchoolYearArchive(year);
  if (existing && !options?.force) {
    throw new Error(`Schooljaar ${year} is al gearchiveerd op ${existing.archived_at}.`);
  }

  const [students, allRecords, timetables] = await Promise.all([
    loadAllStudents(),
    loadAllDailyRecords(),
    loadTimetables(year).catch(() => [] as Timetable[]),
  ]);

  const yearRecords = allRecords.filter((r) => r.date >= range.from && r.date <= range.to);
  const daily_records: Record<string, DailyRecord> = {};
  let chilloutsTotal = 0;
  for (const record of yearRecords) {
    daily_records[record.date] = record;
    chilloutsTotal += countChillOutsInRecord(record).total;
  }

  const archive: SchoolYearArchive = {
    year,
    from_date: range.from,
    to_date: range.to,
    archived_at: new Date().toISOString(),
    archived_by: options?.archivedBy || null,
    students_count: students.length,
    records_count: yearRecords.length,
    chillouts_total: chilloutsTotal,
    students: students.map((s) => ({
      id: s.id,
      name: s.name,
      klas: s.klas,
      status: s.status,
    })),
    daily_records,
    timetables,
    meta: {
      note: 'Snapshot vóór opschonen actieve app voor nieuw schooljaar',
    },
  };

  const savedToTable = await saveArchiveToTable(archive, !!options?.force);
  if (!savedToTable) {
    await saveArchiveToSettings(archive, !!options?.force);
  }

  // Verify archive readable before purge — must include students + daily_records
  const verified = await getSchoolYearArchive(year);
  if (
    !verified ||
    verified.records_count !== archive.records_count ||
    !verified.students?.length ||
    Object.keys(verified.daily_records || {}).length !== archive.records_count
  ) {
    throw new Error(
      'Archief kon niet worden geverifieerd (studenten + daily records vereist). Er is niets verwijderd.'
    );
  }

  const client = requireSupabase();

  // Purge daily records in range (batched by dates)
  const dates = yearRecords.map((r) => r.date);
  let purgedRecords = 0;
  const chunkSize = 50;
  for (let i = 0; i < dates.length; i += chunkSize) {
    const chunk = dates.slice(i, i + chunkSize);
    const { data, error } = await client
      .from('daily_records')
      .delete()
      .in('date', chunk)
      .select('date');
    if (error) throw error;
    purgedRecords += data?.length || 0;
  }

  // Clear student roster (archived copy remains)
  const { data: deletedStudents, error: studErr } = await client
    .from('students')
    .delete()
    .not('id', 'is', null)
    .select('id');
  if (studErr) throw studErr;
  const purgedStudents = deletedStudents?.length || 0;

  // Clear klas order setting for fresh year
  try {
    await setAppSetting('klassen_order', []);
  } catch {
    /* optional */
  }

  return {
    year,
    studentsCount: archive.students_count,
    recordsCount: archive.records_count,
    chilloutsTotal: archive.chillouts_total,
    purgedRecords,
    purgedStudents,
    storage: savedToTable ? 'table' : 'app_settings',
  };
}

/** Schooljaren die klaar zijn om te archiveren (afgelopen + nog data in live tabellen). */
export async function listYearsReadyToArchive(): Promise<string[]> {
  const records = await loadAllDailyRecords();
  const years = new Set<string>();
  for (const r of records) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) continue;
    const d = new Date(`${r.date}T12:00:00`);
    if (Number.isNaN(d.getTime())) continue;
    const y = getSchoolYear(d);
    if (isSchoolYearCompleted(y)) years.add(y);
  }

  const ready: string[] = [];
  for (const year of Array.from(years).sort().reverse()) {
    if (!(await isSchoolYearArchived(year))) ready.push(year);
  }
  return ready;
}

/** Alleen-lezen helpers voor consultatie van gearchiveerde studenten/dagen. */

export type ArchivedStudentRow = Student & {
  chilloutsTotal: number;
  daysWithChillouts: number;
};

export type ArchivedDayRow = {
  date: string;
  dayName: string;
  total: number;
  vr: number;
  vl: number;
  generic: number;
  studentsPresent: number;
};

export function queryArchivedStudents(
  archive: SchoolYearArchive,
  options?: { query?: string; klas?: string }
): ArchivedStudentRow[] {
  const q = (options?.query || '').trim().toLowerCase();
  const klasFilter = (options?.klas || '').trim().toLowerCase();
  const rows: ArchivedStudentRow[] = [];

  for (const student of archive.students || []) {
    if (q && !student.name.toLowerCase().includes(q) && !student.klas.toLowerCase().includes(q)) {
      continue;
    }
    if (klasFilter && student.klas.toLowerCase() !== klasFilter) continue;

    let chilloutsTotal = 0;
    let daysWithChillouts = 0;
    for (const record of Object.values(archive.daily_records || {})) {
      const entries = record.entries?.[student.id];
      if (!entries) continue;
      const c = countChillOutsInRecord({
        date: record.date,
        dayName: record.dayName,
        entries: { [student.id]: entries },
      }).total;
      if (c > 0) {
        chilloutsTotal += c;
        daysWithChillouts += 1;
      }
    }

    rows.push({ ...student, chilloutsTotal, daysWithChillouts });
  }

  return rows.sort(
    (a, b) =>
      b.chilloutsTotal - a.chilloutsTotal ||
      a.name.localeCompare(b.name, 'nl') ||
      a.klas.localeCompare(b.klas, 'nl')
  );
}

export function queryArchivedDays(
  archive: SchoolYearArchive,
  options?: { from?: string; to?: string; query?: string }
): ArchivedDayRow[] {
  const from = options?.from || archive.from_date;
  const to = options?.to || archive.to_date;
  const q = (options?.query || '').trim().toLowerCase();
  const rows: ArchivedDayRow[] = [];

  for (const record of Object.values(archive.daily_records || {})) {
    if (record.date < from || record.date > to) continue;
    if (q && !record.date.includes(q) && !(record.dayName || '').toLowerCase().includes(q)) {
      continue;
    }
    const counts = countChillOutsInRecord(record);
    const studentsPresent = Object.keys(record.entries || {}).filter((id) => {
      const c = countChillOutsInRecord({
        date: record.date,
        dayName: record.dayName,
        entries: { [id]: record.entries[id] },
      }).total;
      return c > 0;
    }).length;

    rows.push({
      date: record.date,
      dayName: record.dayName,
      total: counts.total,
      vr: counts.vr,
      vl: counts.vl,
      generic: counts.generic,
      studentsPresent,
    });
  }

  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

export function getArchivedStudentTimeline(
  archive: SchoolYearArchive,
  studentId: string
): Array<{ date: string; dayName: string; total: number; vr: number; vl: number; generic: number; hours: number[] }> {
  const out: Array<{
    date: string;
    dayName: string;
    total: number;
    vr: number;
    vl: number;
    generic: number;
    hours: number[];
  }> = [];

  for (const record of Object.values(archive.daily_records || {})) {
    const entries = record.entries?.[studentId];
    if (!entries) continue;
    const counts = countChillOutsInRecord({
      date: record.date,
      dayName: record.dayName,
      entries: { [studentId]: entries },
    });
    if (counts.total === 0) continue;
    const hours: number[] = [];
    for (let h = 1; h <= 7; h++) {
      const slot = (entries as Record<string | number, unknown>)[h] ?? (entries as Record<string | number, unknown>)[String(h)];
      if (slot == null) continue;
      if (Array.isArray(slot) && slot.length > 0) hours.push(h);
      else if (!Array.isArray(slot) && slot) hours.push(h);
    }
    out.push({
      date: record.date,
      dayName: record.dayName,
      total: counts.total,
      vr: counts.vr,
      vl: counts.vl,
      generic: counts.generic,
      hours,
    });
  }

  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export function getArchivedDayDetail(
  archive: SchoolYearArchive,
  date: string
): {
  record: DailyRecord | null;
  rows: Array<{
    studentId: string;
    name: string;
    klas: string;
    total: number;
    vr: number;
    vl: number;
    generic: number;
    byHour: Record<number, number>;
  }>;
} {
  const record = archive.daily_records?.[date] || null;
  if (!record) return { record: null, rows: [] };
  const byId = new Map((archive.students || []).map((s) => [s.id, s]));
  const rows: Array<{
    studentId: string;
    name: string;
    klas: string;
    total: number;
    vr: number;
    vl: number;
    generic: number;
    byHour: Record<number, number>;
  }> = [];

  for (const [studentId, entries] of Object.entries(record.entries || {})) {
    const studentEntries = entries as Record<string | number, unknown>;
    const counts = countChillOutsInStudentEntries(studentEntries);
    if (counts.total === 0) continue;
    const student = byId.get(studentId);
    const byHour: Record<number, number> = {};
    for (let h = 1; h <= 7; h++) {
      const slot = getHourSlot(studentEntries, h);
      const hourCount = countChillOutsInStudentEntries({ [h]: slot }).total;
      if (hourCount > 0) byHour[h] = hourCount;
    }
    rows.push({
      studentId,
      name: student?.name || studentId,
      klas: student?.klas || '(Onbekend)',
      total: counts.total,
      vr: counts.vr,
      vl: counts.vl,
      generic: counts.generic,
      byHour,
    });
  }

  rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'nl'));
  return { record, rows };
}

/** Hard blok: archieven mogen nooit via de app worden gewijzigd/verwijderd. */
export function assertArchiveImmutable(): never {
  throw new Error(
    'Gearchiveerde gegevens zijn alleen-lezen en kunnen niet worden gewijzigd of verwijderd.'
  );
}

