import { DailyRecord, Student } from '@/types';
import { supabase, isSupabaseEnabled } from './supabase';
import { fixSemicolonName } from './studentImport';

const PAGE_SIZE = 1000;

function asDateKey(value: unknown): string {
  return String(value ?? '').slice(0, 10);
}

function requireSupabase() {
  if (!isSupabaseEnabled || !supabase) {
    throw new Error(
      'Supabase is niet geconfigureerd. Zet NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY in.'
    );
  }
  return supabase;
}

async function loadAllStudents(): Promise<Student[]> {
  const client = requireSupabase();
  const students: Student[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await client
      .from('students')
      .select('*')
      .order('klas', { ascending: true })
      .order('name', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    const batch = (data || []) as Student[];
    students.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return students.map((student) => ({
    ...student,
    name: fixSemicolonName(String(student.name || '')),
  }));
}

/**
 * Weekoverzicht: alleen studenten + de 5 weekdagen.
 * Vermijdt loadData() (hele historiek + migratie-schrijfactie), dat faalt
 * of blijft hangen voor leerkrachten op tragere netwerken.
 */
export async function loadWeeklyPageData(dates: string[]): Promise<{
  students: Student[];
  dailyRecords: { [date: string]: DailyRecord };
}> {
  const client = requireSupabase();
  const keys = dates.map(asDateKey).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date));

  const [students, recordsResult] = await Promise.all([
    loadAllStudents(),
    keys.length
      ? client.from('daily_records').select('date, day_name, entries').in('date', keys)
      : Promise.resolve({ data: [] as { date: unknown; day_name: string; entries: DailyRecord['entries'] }[], error: null }),
  ]);

  if (recordsResult.error) throw recordsResult.error;

  const dailyRecords: { [date: string]: DailyRecord } = {};
  for (const row of recordsResult.data || []) {
    const date = asDateKey(row.date);
    if (!date) continue;
    dailyRecords[date] = {
      date,
      dayName: row.day_name,
      entries: row.entries || {},
    };
  }

  return { students, dailyRecords };
}
