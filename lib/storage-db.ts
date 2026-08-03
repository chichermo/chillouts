import { supabase, isSupabaseEnabled } from './supabase';
import { AppData, Student, DailyRecord, AuditLog } from '@/types';
import {
  countChillOutsInRecord,
  countChillOutsInStudentEntries,
  countChillOutsInStudentEntriesLegacy,
  emptyChillOutCounts,
  sanitizeDailyRecord,
  sanitizeStudentEntries,
  pruneStudentEntriesForDay,
  parseRecordDate,
  getDayName,
  type ChillOutCounts,
  type PruneChilloutRegistrationOptions,
} from './utils';
import { getAppSetting, setAppSetting } from './app-settings';
import { fixSemicolonName } from './studentImport';

const CHILLOUT_MIGRATION_KEY = 'chillout_storage_migration_v3';

export type ChilloutMigrationSummary = {
  version: number;
  completedAt: string;
  recordsChecked: number;
  recordsUpdated: number;
  chilloutsBefore: number;
  chilloutsAfter: number;
  legacyInflatedBefore: number;
  studentsAffected: number;
};

/** Normaliseer alle daily_records naar canonieke opslag (1 chill-out = 1 array-item) */
export function migrateCanonicalChilloutStorage(data: AppData): {
  changed: boolean;
  changedDates: string[];
  summary: ChilloutMigrationSummary;
} {
  let recordsUpdated = 0;
  let recordsChecked = 0;
  let chilloutsBefore = 0;
  let chilloutsAfter = 0;
  let legacyInflatedBefore = 0;
  const studentsAffected = new Set<string>();
  const changedDates: string[] = [];

  for (const record of Object.values(data.dailyRecords)) {
    recordsChecked++;
    const before = countChillOutsInRecord(record);
    chilloutsBefore += before.total;

    for (const studentId of Object.keys(record.entries)) {
      const raw = record.entries[studentId] as Record<string | number, unknown> | undefined;
      const legacy = countChillOutsInStudentEntriesLegacy(raw);
      legacyInflatedBefore += legacy.total;
    }

    const sanitized = sanitizeDailyRecord(record);
    const after = countChillOutsInRecord(sanitized);
    chilloutsAfter += after.total;

    const rawJson = JSON.stringify(record.entries);
    const sanitizedJson = JSON.stringify(sanitized.entries);
    if (rawJson !== sanitizedJson) {
      for (const studentId of Object.keys(record.entries)) {
        const raw = record.entries[studentId] as Record<string | number, unknown> | undefined;
        const b = countChillOutsInStudentEntries(raw);
        const a = countChillOutsInStudentEntries(
          sanitized.entries[studentId] as Record<string | number, unknown>
        );
        if (b.total !== a.total) studentsAffected.add(studentId);
      }
      data.dailyRecords[record.date] = sanitized;
      recordsUpdated++;
      changedDates.push(record.date);
    }
  }

  return {
    changed: recordsUpdated > 0,
    changedDates,
    summary: {
      version: 3,
      completedAt: new Date().toISOString(),
      recordsChecked,
      recordsUpdated,
      chilloutsBefore,
      chilloutsAfter,
      legacyInflatedBefore,
      studentsAffected: studentsAffected.size,
    },
  };
}

async function loadStudentsFromSupabase(): Promise<Student[]> {
  const { data: students, error } = await supabase!
    .from('students')
    .select('*')
    .order('klas', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  // Normalize accents on read so legacy "Jos é" displays as "José"
  return (students || []).map((s: Student) => ({
    ...s,
    name: fixSemicolonName(String(s.name || '')),
  }));
}

async function loadDailyRecordsFromSupabase(): Promise<{ [date: string]: DailyRecord }> {
  const { data: dailyRecordsData, error } = await supabase!
    .from('daily_records')
    .select('date, day_name, entries');

  if (error) throw error;

  const dailyRecords: { [date: string]: DailyRecord } = {};
  dailyRecordsData?.forEach((record: { date: string; day_name: string; entries: DailyRecord['entries'] }) => {
    dailyRecords[record.date] = {
      date: record.date,
      dayName: record.day_name,
      entries: record.entries || {},
    };
  });
  return dailyRecords;
}

// Gegevenslaag: alleen Supabase (geen localStorage voor app-data)
async function loadFromSupabase(): Promise<AppData | null> {
  if (!isSupabaseEnabled) {
    console.log('Supabase no está habilitado');
    return null;
  }

  try {
    console.log('Cargando datos de Supabase...');
    const [students, dailyRecords] = await Promise.all([
      loadStudentsFromSupabase(),
      loadDailyRecordsFromSupabase(),
    ]);

    console.log(
      `Datos cargados: ${students.length} estudiantes, ${Object.keys(dailyRecords).length} días`
    );

    return {
      students,
      dailyRecords,
      weeklyTotals: {},
    };
  } catch (error) {
    console.error('Error loading from Supabase:', error);
    return null;
  }
}

async function shouldRunChilloutMigration(): Promise<boolean> {
  try {
    const prior = await getAppSetting<ChilloutMigrationSummary>(CHILLOUT_MIGRATION_KEY);
    return !(prior?.version === 3 && prior.recordsUpdated === 0);
  } catch {
    return true;
  }
}

export async function saveDailyRecords(records: DailyRecord[]): Promise<void> {
  if (!isSupabaseEnabled) {
    throw new Error(
      'Supabase is niet geconfigureerd. Zet NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY in.'
    );
  }
  if (records.length === 0) return;

  const rows = records.map((record) => {
    const sanitized = sanitizeDailyRecord(record);
    return {
      date: sanitized.date,
      day_name: sanitized.dayName,
      entries: sanitized.entries,
    };
  });

  const { error } = await supabase!.from('daily_records').upsert(rows, { onConflict: 'date' });
  if (error) throw error;
}

/** Alleen studenten + één dag — sneller voor Dagelijks-registratie */
export async function loadDailyPageData(date: string): Promise<{
  students: Student[];
  record: DailyRecord | null;
}> {
  if (!isSupabaseEnabled) {
    throw new Error(
      'Supabase is niet geconfigureerd. Zet NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY in.'
    );
  }

  const [students, record] = await Promise.all([
    loadStudentsFromSupabase(),
    getDailyRecord(date),
  ]);

  return { students, record };
}

/** Alleen datums met registratie — sneller voor dagoverzicht */
export async function loadDailyRecordDates(): Promise<string[]> {
  if (!isSupabaseEnabled) {
    throw new Error(
      'Supabase is niet geconfigureerd. Zet NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY in.'
    );
  }

  const { data, error } = await supabase!
    .from('daily_records')
    .select('date')
    .order('date', { ascending: false });

  if (error) throw error;
  return (data || []).map((row) => row.date as string);
}

async function saveToSupabase(data: AppData): Promise<boolean> {
  if (!isSupabaseEnabled) return false;

  try {
    // Guardar estudiantes (upsert) — normalize names so legacy "Jos é" is repaired on write
    if (data.students.length > 0) {
      const students = data.students.map((s) => ({
        ...s,
        name: fixSemicolonName(String(s.name || '')),
      }));
      const { error: studentsError } = await supabase!
        .from('students')
        .upsert(students, { onConflict: 'id' });

      if (studentsError) throw studentsError;
    }

    // Guardar registros diarios (upsert)
    const dailyRecordsArray = Object.values(data.dailyRecords).map(record => ({
      date: record.date,
      day_name: record.dayName,
      entries: record.entries,
    }));

    if (dailyRecordsArray.length > 0) {
      const { error: recordsError } = await supabase!
        .from('daily_records')
        .upsert(dailyRecordsArray, { onConflict: 'date' });

      if (recordsError) throw recordsError;
    }

    return true;
  } catch (error) {
    console.error('Error saving to Supabase:', error);
    return false;
  }
}

// Alle gegevens alleen via Supabase (geen localStorage-fallback)
export async function loadData(): Promise<AppData> {
  if (!isSupabaseEnabled) {
    throw new Error(
      'Supabase is niet geconfigureerd. Zet NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY in.'
    );
  }

  const supabaseData = await loadFromSupabase();
  if (supabaseData === null) {
    throw new Error('Kon gegevens niet laden van Supabase. Controleer je verbinding en tabellen.');
  }

  let summary: ChilloutMigrationSummary | null = null;

  if (await shouldRunChilloutMigration()) {
    const { changed, changedDates, summary: migrationSummary } =
      migrateCanonicalChilloutStorage(supabaseData);
    summary = migrationSummary;

    if (changed) {
      console.log(
        `[chillout-migratie] ${summary.recordsUpdated} dagen bijgewerkt in Supabase: ` +
          `${summary.chilloutsBefore} → ${summary.chilloutsAfter} chill-outs ` +
          `(oude Rapporten-telling: ${summary.legacyInflatedBefore})`
      );
      const records = changedDates.map((d) => supabaseData.dailyRecords[d]);
      await saveDailyRecords(records);
    }
  } else {
    try {
      summary = await getAppSetting<ChilloutMigrationSummary>(CHILLOUT_MIGRATION_KEY);
    } catch {
      summary = null;
    }
  }

  if (summary) {
    try {
      await setAppSetting(CHILLOUT_MIGRATION_KEY, summary);
    } catch {
      /* niet blokkeren */
    }
  }

  return supabaseData;
}

export async function saveData(data: AppData): Promise<void> {
  if (!isSupabaseEnabled) {
    throw new Error(
      'Supabase is niet geconfigureerd. Zet NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY in.'
    );
  }

  const success = await saveToSupabase(data);
  if (!success) {
    throw new Error('Kon gegevens niet opslaan in Supabase.');
  }
}

export async function addStudent(student: Omit<Student, 'id'>): Promise<Student> {
  const data = await loadData();
  const newStudent: Student = {
    ...student,
    name: fixSemicolonName(String(student.name || '')),
    id: `student_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };
  
  data.students.push(newStudent);
  await saveData(data);
  
  // Registrar en auditoría
  await logAuditAction({
    action: 'created',
    studentId: newStudent.id,
    studentName: newStudent.name,
    studentKlas: newStudent.klas,
    studentData: newStudent,
  });
  
  return newStudent;
}

/** Bulk upsert leerlingen (behoudt volgorde van de importlijst). */
export async function addStudentsBulk(
  rows: Array<Omit<Student, 'id'> | Student>
): Promise<{ saved: number; students: Student[] }> {
  if (!isSupabaseEnabled || !supabase) {
    throw new Error(
      'Supabase is niet geconfigureerd. Zet NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY in.'
    );
  }

  const stamp = Date.now();
  const students: Student[] = rows
    .map((row, index) => {
      const status: Student['status'] = row.status === 'Inactief' ? 'Inactief' : 'Actief';
      return {
        id: 'id' in row && row.id ? row.id : `student_${stamp}_${index}`,
        name: fixSemicolonName(String(row.name || '')),
        klas: String(row.klas || '').trim(),
        status,
      };
    })
    .filter((s) => s.name && s.klas);

  if (!students.length) {
    throw new Error('Geen geldige leerlingen om op te slaan.');
  }

  const chunkSize = 100;
  for (let i = 0; i < students.length; i += chunkSize) {
    const chunk = students.slice(i, i + chunkSize);
    const { error } = await supabase.from('students').upsert(chunk, { onConflict: 'id' });
    if (error) throw error;
  }

  return { saved: students.length, students };
}

export async function updateStudent(studentId: string, updates: Partial<Student>): Promise<void> {
  const data = await loadData();
  const index = data.students.findIndex(s => s.id === studentId);
  if (index !== -1) {
    const next = { ...data.students[index], ...updates };
    if (updates.name != null) {
      next.name = fixSemicolonName(String(updates.name));
    }
    data.students[index] = next;
    await saveData(data);
  }
}

export async function deleteStudent(studentId: string): Promise<void> {
  const data = await loadData();
  const studentToDelete = data.students.find(s => s.id === studentId);
  
  if (!studentToDelete) {
    throw new Error('Estudiante no encontrado');
  }
  
  // Registrar en auditoría ANTES de eliminar
  await logAuditAction({
    action: 'deleted',
    studentId: studentToDelete.id,
    studentName: studentToDelete.name,
    studentKlas: studentToDelete.klas,
    studentData: studentToDelete, // Guardar datos completos para poder revertir
  });
  
  // Eliminar de Supabase explícitamente si está habilitado
  if (isSupabaseEnabled) {
    const { error } = await supabase!
      .from('students')
      .delete()
      .eq('id', studentId);
    
    if (error) {
      console.error('Error eliminando estudiante de Supabase:', error);
      throw error;
    }
  }
  
  data.students = data.students.filter((s) => s.id !== studentId);
}

async function archiveDailyRecordBeforeSave(date: string): Promise<void> {
  if (!supabase) return;

  const { data: existing, error: readError } = await supabase
    .from('daily_records')
    .select('date, day_name, entries')
    .eq('date', date)
    .maybeSingle();

  if (readError || !existing) return;

  const historyId = `hist_${date}_${Date.now()}`;
  const { error: histError } = await supabase.from('daily_record_history').insert({
    id: historyId,
    date: existing.date,
    day_name: existing.day_name,
    entries: existing.entries ?? {},
    saved_at: new Date().toISOString(),
    source: 'before_update',
  });

  if (histError) {
    const msg = String(histError.message || '').toLowerCase();
    if (
      histError.code === 'PGRST205' ||
      histError.code === '42P01' ||
      msg.includes('does not exist') ||
      msg.includes('daily_record_history')
    ) {
      console.warn(
        '[backup] Tabel daily_record_history ontbreekt — voer supabase/daily_record_history.sql uit in Supabase.'
      );
      return;
    }
    console.warn('[backup] Kon dagrecord niet archiveren:', histError.message);
  }
}

export async function saveDailyRecord(record: DailyRecord): Promise<void> {
  if (!isSupabaseEnabled) {
    throw new Error(
      'Supabase is niet geconfigureerd. Zet NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY in.'
    );
  }

  const sanitized = sanitizeDailyRecord(record);
  await archiveDailyRecordBeforeSave(sanitized.date);

  const { data, error } = await supabase!
    .from('daily_records')
    .upsert(
      {
        date: sanitized.date,
        day_name: sanitized.dayName,
        entries: sanitized.entries,
      },
      { onConflict: 'date' }
    )
    .select('date');

  if (error) throw error;
  if (!data?.length) {
    throw new Error('Opslaan mislukt: dagrecord niet bevestigd door Supabase.');
  }
}

/** Repareer opgeslagen entries voor één student (canonieke arrays, dubbele lesuur-keys) */
export async function repairStudentChilloutEntries(studentId: string): Promise<{
  datesUpdated: number;
  datesChecked: number;
  before: ChillOutCounts;
  after: ChillOutCounts;
}> {
  const data = await loadData();
  const before = emptyChillOutCounts();
  const after = emptyChillOutCounts();
  let datesUpdated = 0;
  let datesChecked = 0;
  const changedRecords: DailyRecord[] = [];

  for (const record of Object.values(data.dailyRecords)) {
    const raw = record.entries[studentId] as Record<string | number, unknown> | undefined;
    if (!raw) continue;

    datesChecked++;
    const b = countChillOutsInStudentEntries(raw);
    before.total += b.total;
    before.vr += b.vr;
    before.vl += b.vl;
    before.generic += b.generic;

    const sanitized = sanitizeStudentEntries(raw);
    const a = countChillOutsInStudentEntries(sanitized);
    after.total += a.total;
    after.vr += a.vr;
    after.vl += a.vl;
    after.generic += a.generic;

    const rawJson = JSON.stringify(raw);
    const sanitizedJson = JSON.stringify(sanitized);
    if (rawJson !== sanitizedJson) {
      record.entries[studentId] = sanitized;
      datesUpdated++;
      changedRecords.push(record);
    }
  }

  if (changedRecords.length > 0) {
    await saveDailyRecords(changedRecords);
  }

  return { datesUpdated, datesChecked, before, after };
}

/**
 * Corrigeert overtelling: generics alleen op primaire lesdag (bv. Di),
 * maximaal 1 VR en 1 VL over het hele schooljaar.
 */
export async function correctStudentOverregisteredChillouts(
  studentId: string,
  options: PruneChilloutRegistrationOptions = {}
): Promise<{
  datesUpdated: number;
  datesChecked: number;
  before: ChillOutCounts;
  after: ChillOutCounts;
}> {
  const data = await loadData();
  const before = emptyChillOutCounts();
  const after = emptyChillOutCounts();
  let datesUpdated = 0;
  let datesChecked = 0;
  const changedRecords: DailyRecord[] = [];
  const caps = {
    vrRemaining: options.maxVr ?? 1,
    vlRemaining: options.maxVl ?? 1,
  };

  const sortedDates = Object.keys(data.dailyRecords).sort();

  for (const date of sortedDates) {
    const record = data.dailyRecords[date];
    const raw = record.entries[studentId] as Record<string | number, unknown> | undefined;
    if (!raw) continue;

    datesChecked++;
    const b = countChillOutsInStudentEntries(raw);
    before.total += b.total;
    before.vr += b.vr;
    before.vl += b.vl;
    before.generic += b.generic;

    const parsed = parseRecordDate(date);
    const weekday = parsed ? getDayName(parsed) : record.dayName;
    const pruned = pruneStudentEntriesForDay(raw, weekday, options, caps);
    const a = countChillOutsInStudentEntries(pruned);
    after.total += a.total;
    after.vr += a.vr;
    after.vl += a.vl;
    after.generic += a.generic;

    const rawJson = JSON.stringify(sanitizeStudentEntries(raw));
    const prunedJson = JSON.stringify(pruned);
    if (rawJson !== prunedJson) {
      if (Object.keys(pruned).length === 0) {
        delete record.entries[studentId];
      } else {
        record.entries[studentId] = pruned;
      }
      datesUpdated++;
      changedRecords.push(record);
    }
  }

  if (changedRecords.length > 0) {
    await saveDailyRecords(changedRecords);
  }

  return { datesUpdated, datesChecked, before, after };
}

/** Repareer alle studenten in alle dagrecords (canonieke opslag in Supabase) */
export async function repairAllChilloutEntries(): Promise<{
  datesUpdated: number;
  datesChecked: number;
  studentsTouched: number;
  before: ChillOutCounts;
  after: ChillOutCounts;
}> {
  const data = await loadData();
  const before = emptyChillOutCounts();
  const after = emptyChillOutCounts();
  let datesUpdated = 0;
  let datesChecked = 0;
  const studentsTouched = new Set<string>();
  const changedRecords: DailyRecord[] = [];

  for (const record of Object.values(data.dailyRecords)) {
    datesChecked++;
    let recordChanged = false;

    for (const studentId of Object.keys(record.entries)) {
      const raw = record.entries[studentId] as Record<string | number, unknown> | undefined;
      if (!raw) continue;

      const b = countChillOutsInStudentEntries(raw);
      before.total += b.total;
      before.vr += b.vr;
      before.vl += b.vl;
      before.generic += b.generic;

      const sanitized = sanitizeStudentEntries(raw);
      const a = countChillOutsInStudentEntries(sanitized);
      after.total += a.total;
      after.vr += a.vr;
      after.vl += a.vl;
      after.generic += a.generic;

      if (JSON.stringify(raw) !== JSON.stringify(sanitized)) {
        record.entries[studentId] = sanitized;
        studentsTouched.add(studentId);
        recordChanged = true;
      }
    }

    if (recordChanged) {
      datesUpdated++;
      changedRecords.push(record);
    }
  }

  if (changedRecords.length > 0) {
    await saveDailyRecords(changedRecords);
  }

  return {
    datesUpdated,
    datesChecked,
    studentsTouched: studentsTouched.size,
    before,
    after,
  };
}

export async function getDailyRecord(date: string): Promise<DailyRecord | null> {
  if (!isSupabaseEnabled) {
    throw new Error(
      'Supabase is niet geconfigureerd. Zet NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY in.'
    );
  }

  const { data, error } = await supabase!
    .from('daily_records')
    .select('date, day_name, entries')
    .eq('date', date)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return sanitizeDailyRecord({
    date: data.date,
    dayName: data.day_name,
    entries: data.entries ?? {},
  });
}

// Funciones de auditoría
async function logAuditAction(params: {
  action: 'created' | 'deleted' | 'updated';
  studentId: string;
  studentName: string;
  studentKlas: string;
  studentData: Student | null;
}): Promise<void> {
  const auditLogId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const auditLog: Omit<AuditLog, 'id'> = {
    action: params.action,
    studentId: params.studentId,
    studentName: params.studentName,
    studentKlas: params.studentKlas,
    studentData: params.studentData,
    timestamp: new Date().toISOString(),
    reverted: false,
  };

  if (isSupabaseEnabled) {
    try {
      // Mapear a snake_case para Supabase
      const { error } = await supabase!
        .from('audit_logs')
        .insert({
          id: auditLogId,
          action: params.action,
          student_id: params.studentId,
          student_name: params.studentName,
          student_klas: params.studentKlas,
          student_data: params.studentData,
          timestamp: new Date().toISOString(),
          reverted: false,
        });
      
      if (error) {
        console.error('Error guardando log de auditoría:', error);
        // No lanzar error, solo loguear
      }
    } catch (error) {
      console.error('Error guardando log de auditoría:', error);
    }
  }
}

// Funciones para gestionar clases
export async function renameKlas(oldKlasName: string, newKlasName: string): Promise<void> {
  const data = await loadData();
  
  // Actualizar todos los estudiantes con la clase antigua
  data.students.forEach(student => {
    if (student.klas === oldKlasName) {
      student.klas = newKlasName;
    }
  });
  
  await saveData(data);
  
  // Disparar evento para actualizar otras páginas
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('studentsUpdated'));
  }
}

export async function deleteKlas(klasName: string): Promise<{ success: boolean; message: string }> {
  const data = await loadData();
  
  // Verificar si hay estudiantes en esta clase
  const studentsInKlas = data.students.filter(s => s.klas === klasName);
  
  if (studentsInKlas.length > 0) {
    return {
      success: false,
      message: `Deze klas heeft nog ${studentsInKlas.length} student(en). Verwijder eerst alle studenten uit deze klas.`
    };
  }
  
  // Si no hay estudiantes, la clase se elimina automáticamente al no tener referencias
  // No necesitamos hacer nada más ya que las clases se derivan de los estudiantes
  
  return {
    success: true,
    message: 'Klas succesvol verwijderd.'
  };
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  if (isSupabaseEnabled) {
    try {
      const { data, error } = await supabase!
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false });
      
      if (error) {
        console.error('Error cargando logs de auditoría:', error);
        return [];
      }
      
      // Mapear de snake_case a camelCase
      return (data || []).map((log: any) => ({
        id: log.id,
        action: log.action,
        studentId: log.student_id,
        studentName: log.student_name,
        studentKlas: log.student_klas,
        studentData: log.student_data,
        timestamp: log.timestamp,
        reverted: log.reverted,
      }));
    } catch (error) {
      console.error('Error cargando logs de auditoría:', error);
      return [];
    }
  }

  return [];
}

export async function revertAuditLog(auditLogId: string): Promise<void> {
  if (isSupabaseEnabled) {
    // Obtener el log
    const { data: log, error: fetchError } = await supabase!
      .from('audit_logs')
      .select('*')
      .eq('id', auditLogId)
      .single();
    
    if (fetchError || !log) {
      throw new Error('Log de auditoría no encontrado');
    }
    
    if (log.reverted) {
      throw new Error('Este cambio ya fue revertido');
    }
    
    if (log.action === 'deleted' && log.studentData) {
      // Revertir eliminación: restaurar el estudiante
      const { error: insertError } = await supabase!
        .from('students')
        .upsert(log.studentData, { onConflict: 'id' });
      
      if (insertError) {
        throw insertError;
      }
    } else if (log.action === 'created') {
      // Revertir creación: eliminar el estudiante
      const { error: deleteError } = await supabase!
        .from('students')
        .delete()
        .eq('id', log.studentId);
      
      if (deleteError) {
        throw deleteError;
      }
    }
    
    // Marcar como revertido
    const { error: updateError } = await supabase!
      .from('audit_logs')
      .update({ reverted: true })
      .eq('id', auditLogId);
    
    if (updateError) {
      throw updateError;
    }
  } else {
    throw new Error('Supabase is vereist om auditlogs te beheren.');
  }
}

