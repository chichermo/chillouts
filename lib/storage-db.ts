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
  summary: ChilloutMigrationSummary;
} {
  let recordsUpdated = 0;
  let recordsChecked = 0;
  let chilloutsBefore = 0;
  let chilloutsAfter = 0;
  let legacyInflatedBefore = 0;
  const studentsAffected = new Set<string>();

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
    }
  }

  return {
    changed: recordsUpdated > 0,
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

// Gegevenslaag: alleen Supabase (geen localStorage voor app-data)
async function loadFromSupabase(): Promise<AppData | null> {
  if (!isSupabaseEnabled) {
    console.log('Supabase no está habilitado');
    return null;
  }

  try {
    console.log('Cargando datos de Supabase...');
    
    // Cargar estudiantes
    const { data: students, error: studentsError } = await supabase!
      .from('students')
      .select('*')
      .order('klas', { ascending: true })
      .order('name', { ascending: true });

    if (studentsError) {
      console.error('Error cargando estudiantes:', studentsError);
      throw studentsError;
    }

    console.log(`Estudiantes cargados de Supabase: ${students?.length || 0}`);

    // Cargar registros diarios
    const { data: dailyRecordsData, error: recordsError } = await supabase!
      .from('daily_records')
      .select('*');

    if (recordsError) {
      console.error('Error cargando registros:', recordsError);
      throw recordsError;
    }

    console.log(`Registros cargados de Supabase: ${dailyRecordsData?.length || 0}`);

    // Convertir registros diarios al formato esperado
    const dailyRecords: { [date: string]: DailyRecord } = {};
    dailyRecordsData?.forEach((record: any) => {
      dailyRecords[record.date] = {
        date: record.date,
        dayName: record.day_name,
        entries: record.entries || {},
      };
    });

    const result = {
      students: students || [],
      dailyRecords,
      weeklyTotals: {}, // Se calcula dinámicamente
    };

    console.log('Datos cargados exitosamente de Supabase');
    return result;
  } catch (error) {
    console.error('Error loading from Supabase:', error);
    return null;
  }
}

async function saveToSupabase(data: AppData): Promise<boolean> {
  if (!isSupabaseEnabled) return false;

  try {
    // Guardar estudiantes (upsert)
    if (data.students.length > 0) {
      const { error: studentsError } = await supabase!
        .from('students')
        .upsert(data.students, { onConflict: 'id' });

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

  const { changed, summary } = migrateCanonicalChilloutStorage(supabaseData);

  if (changed) {
    console.log(
      `[chillout-migratie] ${summary.recordsUpdated} dagen bijgewerkt in Supabase: ` +
        `${summary.chilloutsBefore} → ${summary.chilloutsAfter} chill-outs ` +
        `(oude Rapporten-telling: ${summary.legacyInflatedBefore})`
    );
    const saved = await saveToSupabase(supabaseData);
    if (!saved) {
      throw new Error('Migratie mislukt: kon genormaliseerde chill-outs niet opslaan in Supabase.');
    }
  }

  try {
    await setAppSetting(CHILLOUT_MIGRATION_KEY, summary);
  } catch {
    /* niet blokkeren */
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

export async function updateStudent(studentId: string, updates: Partial<Student>): Promise<void> {
  const data = await loadData();
  const index = data.students.findIndex(s => s.id === studentId);
  if (index !== -1) {
    data.students[index] = { ...data.students[index], ...updates };
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

export async function saveDailyRecord(record: DailyRecord): Promise<void> {
  if (!isSupabaseEnabled) {
    throw new Error(
      'Supabase is niet geconfigureerd. Zet NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY in.'
    );
  }

  const sanitized = sanitizeDailyRecord(record);
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
    }
  }

  if (datesUpdated > 0) {
    await saveData(data);
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
    }
  }

  if (datesUpdated > 0) {
    await saveData(data);
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

    if (recordChanged) datesUpdated++;
  }

  if (datesUpdated > 0) {
    await saveData(data);
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

