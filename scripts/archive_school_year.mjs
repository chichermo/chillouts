/**
 * Archiveert een afgesloten schooljaar en ruimt actieve data op.
 * Gebruik:
 *   node scripts/archive_school_year.mjs 2025-2026
 *   node scripts/archive_school_year.mjs 2025-2026 --dry-run
 */
import { createClient } from '@supabase/supabase-js';

const year = process.argv[2] || '2025-2026';
const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://etwyxdbkagbihadvfesq.supabase.co';
const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0d3l4ZGJrYWdiaWhhZHZmZXNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzU3MTAsImV4cCI6MjA4MDYxMTcxMH0.j3v4vGGxAkTsoY9gWFTONm0Rcnh7ojBT9s3papi0-iM';

const supabase = createClient(url, key);
const SETTINGS_KEY = `year_archive:${year}`;

function getRange(y) {
  const m = /^(\d{4})-(\d{4})$/.exec(y);
  if (!m) return null;
  const start = Number(m[1]);
  const end = Number(m[2]);
  if (end !== start + 1) return null;
  return { from: `${start}-09-01`, to: `${end}-06-30` };
}

function isCompleted(range) {
  return Date.now() > new Date(`${range.to}T23:59:59`).getTime();
}

function countChillouts(record) {
  let total = 0;
  for (const entries of Object.values(record.entries || {})) {
    if (!entries || typeof entries !== 'object') continue;
    for (let h = 1; h <= 7; h++) {
      const slot = entries[h] ?? entries[String(h)];
      if (Array.isArray(slot)) total += slot.length;
      else if (slot && typeof slot === 'object' && 'count' in slot) {
        const c = Number(slot.count);
        total += Number.isFinite(c) ? Math.max(0, c) : 1;
      } else if (slot) total += 1;
    }
  }
  return total;
}

const range = getRange(year);
if (!range) {
  console.error('Ongeldig schooljaar', year);
  process.exit(1);
}

if (!force && !isCompleted(range)) {
  console.error(`Schooljaar ${year} is nog niet afgelopen (${range.to}). Gebruik --force om te forceren.`);
  process.exit(1);
}

const { data: existingSetting } = await supabase
  .from('app_settings')
  .select('key')
  .eq('key', SETTINGS_KEY)
  .maybeSingle();

const { data: existingTable, error: tableErr } = await supabase
  .from('school_year_archives')
  .select('year')
  .eq('year', year)
  .maybeSingle();

const tableMissing =
  tableErr &&
  (String(tableErr.message || '').includes('schema cache') ||
    String(tableErr.message || '').includes('does not exist') ||
    tableErr.code === 'PGRST205' ||
    tableErr.code === '42P01');

if ((existingSetting || existingTable) && !force) {
  console.error(`Schooljaar ${year} is al gearchiveerd. Gebruik --force om opnieuw te archiveren.`);
  process.exit(1);
}

const { data: students, error: sErr } = await supabase.from('students').select('*');
if (sErr) throw sErr;

const { data: records, error: rErr } = await supabase
  .from('daily_records')
  .select('*')
  .order('date');
if (rErr) throw rErr;

const yearRows = (records || []).filter((r) => r.date >= range.from && r.date <= range.to);
const daily_records = {};
let chillouts_total = 0;
for (const row of yearRows) {
  const rec = { date: row.date, dayName: row.day_name, entries: row.entries || {} };
  daily_records[row.date] = rec;
  chillouts_total += countChillouts(rec);
}

const { data: timetables } = await supabase.from('timetables').select('*').eq('year', year);

const archive = {
  year,
  from_date: range.from,
  to_date: range.to,
  archived_at: new Date().toISOString(),
  archived_by: 'script:archive_school_year',
  students_count: (students || []).length,
  records_count: yearRows.length,
  chillouts_total,
  students: (students || []).map((s) => ({
    id: s.id,
    name: s.name,
    klas: s.klas,
    status: s.status,
  })),
  daily_records,
  timetables: timetables || [],
  meta: { note: 'Snapshot vóór opschonen nieuw schooljaar' },
};

console.log('=== Archive preview ===');
console.log({
  year,
  range,
  students: archive.students_count,
  records: archive.records_count,
  chillouts: archive.chillouts_total,
  dryRun,
  tableMissing: !!tableMissing,
});

if (dryRun) {
  console.log('Dry-run: niets opgeslagen of verwijderd.');
  process.exit(0);
}

let storage = 'app_settings';
if (!tableMissing) {
  const { error } = await supabase.from('school_year_archives').upsert(
    {
      year: archive.year,
      from_date: archive.from_date,
      to_date: archive.to_date,
      archived_at: archive.archived_at,
      archived_by: archive.archived_by,
      students_count: archive.students_count,
      records_count: archive.records_count,
      chillouts_total: archive.chillouts_total,
      students: archive.students,
      daily_records: archive.daily_records,
      timetables: archive.timetables,
      meta: archive.meta,
    },
    { onConflict: 'year' }
  );
  if (error) {
    console.warn('Table upsert failed, fallback app_settings:', error.message);
  } else {
    storage = 'table';
  }
}

if (storage === 'app_settings') {
  const { error } = await supabase.from('app_settings').upsert(
    { key: SETTINGS_KEY, value: archive, updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  );
  if (error) {
    console.error('Kon archief niet opslaan:', error);
    process.exit(1);
  }
}

// Verify
const { data: verify } = await supabase
  .from('app_settings')
  .select('value')
  .eq('key', SETTINGS_KEY)
  .maybeSingle();
const verified =
  storage === 'table'
    ? true
    : verify?.value?.records_count === archive.records_count &&
      verify?.value?.students_count === archive.students_count;

if (!verified && storage === 'app_settings') {
  console.error('Archief verificatie mislukt — er wordt niets verwijderd.');
  process.exit(1);
}

console.log('Archief opgeslagen via', storage);

const dates = yearRows.map((r) => r.date);
let purgedRecords = 0;
for (let i = 0; i < dates.length; i += 50) {
  const chunk = dates.slice(i, i + 50);
  const { data, error } = await supabase.from('daily_records').delete().in('date', chunk).select('date');
  if (error) {
    console.error('Delete records failed:', error);
    process.exit(1);
  }
  purgedRecords += data?.length || 0;
}

const { data: deletedStudents, error: dErr } = await supabase
  .from('students')
  .delete()
  .not('id', 'is', null)
  .select('id');
if (dErr) {
  console.error('Delete students failed:', dErr);
  process.exit(1);
}

await supabase.from('app_settings').upsert(
  { key: 'klassen_order', value: [], updated_at: new Date().toISOString() },
  { onConflict: 'key' }
);

const { count: leftStudents } = await supabase
  .from('students')
  .select('*', { count: 'exact', head: true });
const { count: leftRecords } = await supabase
  .from('daily_records')
  .select('*', { count: 'exact', head: true });

console.log('=== Done ===');
console.log({
  storage,
  purgedRecords,
  purgedStudents: deletedStudents?.length || 0,
  remainingStudents: leftStudents,
  remainingDailyRecords: leftRecords,
});
