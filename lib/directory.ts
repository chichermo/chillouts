import { supabase, isSupabaseEnabled } from './supabase';
import { getAppSetting, setAppSetting } from './app-settings';
import {
  addStudent,
  addStudentsBulk,
  deleteStudent,
} from './storage';
import {
  fixSemicolonName,
  nameTokenKey,
  normalizeGrade,
} from './studentImport';
import type { Student } from '@/types';

const NABLIJVEN_DAYS = ['MAANDAG', 'DINSDAG', 'DONDERDAG'] as const;
const O2_LIJSTEN_KEY = 'o2_lijsten';
const NABLIJVEN_TABLE = 'nablijven_students';

export type DirectoryAppStatus = 'added' | 'exists' | 'removed' | 'missing' | 'error';

export type DirectoryStudent = {
  key: string;
  name: string;
  klas: string;
  chilloutId?: string;
  status?: Student['status'];
  inChillouts: boolean;
  inNablijven: boolean;
  nablijvenDays: number;
  inO2: boolean;
  nablijvenIds: string[];
};

export type DirectoryWriteResult = {
  name: string;
  klas: string;
  chillouts: DirectoryAppStatus;
  nablijven: DirectoryAppStatus;
  o2: DirectoryAppStatus;
  error?: string;
};

type O2Lijsten = {
  leerlingen: string[];
  personeel: string[];
  team: string[];
};

type NablijvenRow = {
  id: string;
  name: string;
  grade: string;
  day: string;
};

function requireSupabase() {
  if (!isSupabaseEnabled || !supabase) {
    throw new Error(
      'Supabase is niet geconfigureerd. Zet NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }
  return supabase;
}

export function directoryKey(name: string, klas: string): string {
  return `${nameTokenKey(name)}::${normalizeGrade(klas).toLowerCase()}`;
}

function displayName(name: string): string {
  return fixSemicolonName(String(name || ''));
}

function sameName(a: string, b: string): boolean {
  return nameTokenKey(a) === nameTokenKey(b);
}

function sameKlas(a: string, b: string): boolean {
  return normalizeGrade(a).toLowerCase() === normalizeGrade(b).toLowerCase();
}

async function loadChilloutStudents(): Promise<Student[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('students')
    .select('id, name, klas, status')
    .order('klas', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return (data || []).map((s) => ({
    id: String(s.id),
    name: displayName(s.name),
    klas: String(s.klas || ''),
    status: s.status === 'Inactief' ? 'Inactief' : 'Actief',
  }));
}

async function loadNablijvenRows(): Promise<NablijvenRow[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from(NABLIJVEN_TABLE)
    .select('id, name, grade, day');
  if (error) {
    const msg = String(error.message || '').toLowerCase();
    if (msg.includes('does not exist') || error.code === 'PGRST205' || error.code === '42P01') {
      return [];
    }
    throw error;
  }
  return (data || []).map((row) => ({
    id: String(row.id),
    name: displayName(row.name),
    grade: normalizeGrade(String(row.grade || '')),
    day: String(row.day || ''),
  }));
}

async function loadO2Lijsten(): Promise<O2Lijsten> {
  const stored = await getAppSetting<O2Lijsten>(O2_LIJSTEN_KEY);
  return {
    leerlingen: Array.isArray(stored?.leerlingen) ? stored.leerlingen.map(displayName) : [],
    personeel: Array.isArray(stored?.personeel) ? stored.personeel : [],
    team: Array.isArray(stored?.team) ? stored.team : [],
  };
}

async function saveO2Lijsten(lijsten: O2Lijsten): Promise<void> {
  await setAppSetting(O2_LIJSTEN_KEY, {
    leerlingen: lijsten.leerlingen,
    personeel: lijsten.personeel,
    team: lijsten.team,
  });
}

export async function listDirectoryStudents(): Promise<DirectoryStudent[]> {
  const [chillout, nablijven, o2] = await Promise.all([
    loadChilloutStudents(),
    loadNablijvenRows(),
    loadO2Lijsten(),
  ]);

  const map = new Map<string, DirectoryStudent>();

  const upsert = (partial: Omit<DirectoryStudent, 'inChillouts' | 'inNablijven' | 'inO2' | 'nablijvenDays' | 'nablijvenIds'> & Partial<DirectoryStudent>) => {
    const key = partial.key;
    const current = map.get(key);
    const next: DirectoryStudent = {
      key,
      name: partial.name || current?.name || '',
      klas: partial.klas || current?.klas || '',
      chilloutId: partial.chilloutId || current?.chilloutId,
      status: partial.status || current?.status,
      inChillouts: partial.inChillouts ?? current?.inChillouts ?? false,
      inNablijven: partial.inNablijven ?? current?.inNablijven ?? false,
      nablijvenDays: partial.nablijvenDays ?? current?.nablijvenDays ?? 0,
      inO2: partial.inO2 ?? current?.inO2 ?? false,
      nablijvenIds: partial.nablijvenIds || current?.nablijvenIds || [],
    };
    map.set(key, next);
  };

  for (const student of chillout) {
    upsert({
      key: directoryKey(student.name, student.klas),
      name: student.name,
      klas: student.klas,
      chilloutId: student.id,
      status: student.status,
      inChillouts: true,
    });
  }

  const nablijvenByKey = new Map<string, NablijvenRow[]>();
  for (const row of nablijven) {
    const key = directoryKey(row.name, row.grade);
    const list = nablijvenByKey.get(key) || [];
    list.push(row);
    nablijvenByKey.set(key, list);
  }
  for (const [key, rows] of nablijvenByKey) {
    const first = rows[0];
    upsert({
      key,
      name: first.name,
      klas: first.grade,
      inNablijven: true,
      nablijvenDays: new Set(rows.map((r) => r.day)).size,
      nablijvenIds: rows.map((r) => r.id),
    });
  }

  const knownNameKeys = new Set(
    [...map.values()].map((s) => nameTokenKey(s.name))
  );
  for (const naam of o2.leerlingen) {
    const token = nameTokenKey(naam);
    const matches = [...map.values()].filter((s) => nameTokenKey(s.name) === token);
    if (matches.length) {
      for (const match of matches) {
        match.inO2 = true;
      }
    } else if (!knownNameKeys.has(token) && naam.trim()) {
      upsert({
        key: directoryKey(naam, ''),
        name: displayName(naam),
        klas: '',
        inO2: true,
      });
    }
  }

  return [...map.values()].sort((a, b) => {
    const klasCmp = a.klas.localeCompare(b.klas, 'nl', { sensitivity: 'base' });
    if (klasCmp !== 0) return klasCmp;
    return a.name.localeCompare(b.name, 'nl', { sensitivity: 'base' });
  });
}

async function addToNablijven(name: string, klas: string): Promise<DirectoryAppStatus> {
  const rows = await loadNablijvenRows();
  const existingDays = new Set(
    rows
      .filter((row) => sameName(row.name, name) && sameKlas(row.grade, klas))
      .map((row) => row.day)
  );
  const missing = NABLIJVEN_DAYS.filter((day) => !existingDays.has(day));
  if (!missing.length) return 'exists';

  const client = requireSupabase();
  const stamp = Date.now();
  const payload = missing.map((day, index) => ({
    id: `dir_${stamp}_${index}_${day.toLowerCase()}`,
    name,
    grade: klas,
    day,
  }));
  const { error } = await client.from(NABLIJVEN_TABLE).upsert(payload, { onConflict: 'id' });
  if (error) throw error;
  return existingDays.size ? 'added' : 'added';
}

async function seedO2Leerlingen(extraNames: string[]): Promise<string[]> {
  const chillout = await loadChilloutStudents();
  const names: string[] = [];
  const seen = new Set<string>();
  for (const student of [...chillout.map((s) => s.name), ...extraNames]) {
    const token = nameTokenKey(student);
    if (!token || seen.has(token)) continue;
    seen.add(token);
    names.push(displayName(student));
  }
  names.sort((a, b) => a.localeCompare(b, 'nl', { sensitivity: 'base' }));
  return names;
}

async function addToO2(name: string): Promise<DirectoryAppStatus> {
  const lijsten = await loadO2Lijsten();
  if (lijsten.leerlingen.some((n) => sameName(n, name))) return 'exists';
  if (!lijsten.leerlingen.length) {
    lijsten.leerlingen = await seedO2Leerlingen([name]);
  } else {
    lijsten.leerlingen = [...lijsten.leerlingen, name].sort((a, b) =>
      a.localeCompare(b, 'nl', { sensitivity: 'base' })
    );
  }
  await saveO2Lijsten(lijsten);
  return 'added';
}

async function removeFromNablijven(name: string, klas: string): Promise<DirectoryAppStatus> {
  const rows = await loadNablijvenRows();
  const ids = rows
    .filter((row) => {
      if (!sameName(row.name, name)) return false;
      if (klas) return sameKlas(row.grade, klas);
      return !row.grade;
    })
    .map((row) => row.id);
  if (!ids.length) return 'missing';
  const client = requireSupabase();
  const { error } = await client.from(NABLIJVEN_TABLE).delete().in('id', ids);
  if (error) throw error;
  return 'removed';
}

async function removeFromO2(name: string, remainingSameName: boolean): Promise<DirectoryAppStatus> {
  const lijsten = await loadO2Lijsten();
  const before = lijsten.leerlingen.length;
  if (remainingSameName) {
    return lijsten.leerlingen.some((n) => sameName(n, name)) ? 'exists' : 'missing';
  }
  lijsten.leerlingen = lijsten.leerlingen.filter((n) => !sameName(n, name));
  if (lijsten.leerlingen.length === before) return 'missing';
  await saveO2Lijsten(lijsten);
  return 'removed';
}

export async function addDirectoryStudent(
  rawName: string,
  rawKlas: string
): Promise<DirectoryWriteResult> {
  const name = displayName(rawName);
  const klas = normalizeGrade(rawKlas);
  const result: DirectoryWriteResult = {
    name,
    klas,
    chillouts: 'missing',
    nablijven: 'missing',
    o2: 'missing',
  };

  if (!name || !klas) {
    throw new Error('Vul naam en klas in.');
  }

  const existing = await loadChilloutStudents();
  const already = existing.find((s) => sameName(s.name, name) && sameKlas(s.klas, klas));

  try {
    if (already) {
      result.chillouts = 'exists';
    } else {
      await addStudent({ name, klas, status: 'Actief' });
      result.chillouts = 'added';
    }
  } catch (error) {
    result.chillouts = 'error';
    result.error = error instanceof Error ? error.message : 'Chill-outs mislukt';
  }

  try {
    result.nablijven = await addToNablijven(name, klas);
  } catch (error) {
    result.nablijven = 'error';
    result.error = [result.error, error instanceof Error ? error.message : 'Nablijven mislukt']
      .filter(Boolean)
      .join(' · ');
  }

  try {
    result.o2 = await addToO2(name);
  } catch (error) {
    result.o2 = 'error';
    result.error = [result.error, error instanceof Error ? error.message : 'O2 mislukt']
      .filter(Boolean)
      .join(' · ');
  }

  return result;
}

export async function addDirectoryStudentsBulk(
  rows: Array<{ name: string; klas?: string; grade?: string }>
): Promise<{ results: DirectoryWriteResult[]; added: number; skipped: number }> {
  const prepared = rows
    .map((row) => ({
      name: displayName(row.name),
      klas: normalizeGrade(row.klas || row.grade || ''),
    }))
    .filter((row) => row.name && row.klas);

  const results: DirectoryWriteResult[] = [];
  let added = 0;
  let skipped = 0;

  const existing = await loadChilloutStudents();
  const existingKeys = new Set(existing.map((s) => directoryKey(s.name, s.klas)));
  const toCreate = prepared.filter((row) => !existingKeys.has(directoryKey(row.name, row.klas)));

  if (toCreate.length) {
    await addStudentsBulk(toCreate.map((row) => ({ name: row.name, klas: row.klas, status: 'Actief' as const })));
  }

  const nablijvenRows = await loadNablijvenRows();
  const nablijvenSeen = new Set(
    nablijvenRows.map((row) => `${directoryKey(row.name, row.grade)}::${row.day}`)
  );
  const nablijvenPayload: Array<{ id: string; name: string; grade: string; day: string }> = [];
  const stamp = Date.now();
  let nabIndex = 0;

  const lijsten = await loadO2Lijsten();
  const o2Seen = new Set(lijsten.leerlingen.map((n) => nameTokenKey(n)));
  const o2Added: string[] = [];

  for (const row of prepared) {
    const key = directoryKey(row.name, row.klas);
    const wasNew = !existingKeys.has(key);
    const result: DirectoryWriteResult = {
      name: row.name,
      klas: row.klas,
      chillouts: wasNew ? 'added' : 'exists',
      nablijven: 'exists',
      o2: o2Seen.has(nameTokenKey(row.name)) ? 'exists' : 'added',
    };

    let nabAdded = false;
    for (const day of NABLIJVEN_DAYS) {
      const dayKey = `${key}::${day}`;
      if (nablijvenSeen.has(dayKey)) continue;
      nablijvenSeen.add(dayKey);
      nablijvenPayload.push({
        id: `dir_${stamp}_${nabIndex}_${day.toLowerCase()}`,
        name: row.name,
        grade: row.klas,
        day,
      });
      nabIndex += 1;
      nabAdded = true;
    }
    result.nablijven = nabAdded ? 'added' : 'exists';

    const token = nameTokenKey(row.name);
    if (!o2Seen.has(token)) {
      o2Seen.add(token);
      o2Added.push(row.name);
      result.o2 = 'added';
    }

    if (result.chillouts === 'exists' && result.nablijven === 'exists' && result.o2 === 'exists') {
      skipped += 1;
    } else {
      added += 1;
    }
    existingKeys.add(key);
    results.push(result);
  }

  if (nablijvenPayload.length) {
    const client = requireSupabase();
    const chunkSize = 100;
    for (let i = 0; i < nablijvenPayload.length; i += chunkSize) {
      const chunk = nablijvenPayload.slice(i, i + chunkSize);
      const { error } = await client.from(NABLIJVEN_TABLE).upsert(chunk, { onConflict: 'id' });
      if (error) throw error;
    }
  }

  if (o2Added.length) {
    lijsten.leerlingen = lijsten.leerlingen.length
      ? [...lijsten.leerlingen, ...o2Added].sort((a, b) =>
          a.localeCompare(b, 'nl', { sensitivity: 'base' })
        )
      : await seedO2Leerlingen(o2Added);
    await saveO2Lijsten(lijsten);
  }

  return { results, added, skipped };
}

export async function removeDirectoryStudent(student: {
  chilloutId?: string;
  name: string;
  klas: string;
}): Promise<DirectoryWriteResult> {
  const name = displayName(student.name);
  const klas = normalizeGrade(student.klas);
  const result: DirectoryWriteResult = {
    name,
    klas,
    chillouts: 'missing',
    nablijven: 'missing',
    o2: 'missing',
  };

  const chillout = await loadChilloutStudents();
  const target =
    (student.chilloutId && chillout.find((s) => s.id === student.chilloutId)) ||
    chillout.find((s) => sameName(s.name, name) && (!klas || sameKlas(s.klas, klas)));

  try {
    if (target) {
      await deleteStudent(target.id);
      result.chillouts = 'removed';
    }
  } catch (error) {
    result.chillouts = 'error';
    result.error = error instanceof Error ? error.message : 'Chill-outs mislukt';
  }

  try {
    result.nablijven = await removeFromNablijven(name, klas || target?.klas || '');
  } catch (error) {
    result.nablijven = 'error';
    result.error = [result.error, error instanceof Error ? error.message : 'Nablijven mislukt']
      .filter(Boolean)
      .join(' · ');
  }

  const remainingSameName = chillout.some(
    (s) => s.id !== target?.id && sameName(s.name, name)
  );
  try {
    result.o2 = await removeFromO2(name, remainingSameName);
  } catch (error) {
    result.o2 = 'error';
    result.error = [result.error, error instanceof Error ? error.message : 'O2 mislukt']
      .filter(Boolean)
      .join(' · ');
  }

  return result;
}
