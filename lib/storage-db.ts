import { supabase, isSupabaseEnabled } from './supabase';
import { AppData, Student, DailyRecord, AuditLog } from '@/types';

// Función helper para usar Supabase o localStorage como fallback
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

// Funciones principales que usan Supabase si está disponible, sino localStorage
export async function loadData(): Promise<AppData> {
  // Intentar cargar de Supabase primero si está habilitado
  if (isSupabaseEnabled) {
    try {
      const supabaseData = await loadFromSupabase();
      // Si Supabase devuelve datos (aunque estén vacíos), usarlos
      // Esto asegura que en producción siempre use Supabase
      if (supabaseData !== null) {
        return supabaseData;
      }
    } catch (error) {
      console.error('Error loading from Supabase, falling back to localStorage:', error);
    }
  }

  // Fallback a localStorage (solo en desarrollo o si Supabase falla)
  if (typeof window === 'undefined') {
    return {
      students: [],
      dailyRecords: {},
      weeklyTotals: {},
    };
  }

  const STORAGE_KEY = 'chillapp_data';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Error loading data:', e);
    }
  }

  return {
    students: [],
    dailyRecords: {},
    weeklyTotals: {},
  };
}

export async function saveData(data: AppData): Promise<void> {
  // Intentar guardar en Supabase primero
  if (isSupabaseEnabled) {
    const success = await saveToSupabase(data);
    if (success) return;
  }

  // Fallback a localStorage
  if (typeof window === 'undefined') return;
  
  try {
    const STORAGE_KEY = 'chillapp_data';
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving data:', e);
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
  
  // Eliminar del array local
  data.students = data.students.filter(s => s.id !== studentId);
  
  // Guardar en localStorage si no se usó Supabase
  if (!isSupabaseEnabled) {
    await saveData(data);
  }
}

export async function saveDailyRecord(record: DailyRecord): Promise<void> {
  const data = await loadData();
  data.dailyRecords[record.date] = record;
  await saveData(data);
}

export async function getDailyRecord(date: string): Promise<DailyRecord | null> {
  const data = await loadData();
  return data.dailyRecords[date] || null;
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
  } else {
    // Fallback a localStorage
    if (typeof window === 'undefined') return;
    
    try {
      const STORAGE_KEY = 'chillapp_audit_logs';
      const stored = localStorage.getItem(STORAGE_KEY);
      const logs: AuditLog[] = stored ? JSON.parse(stored) : [];
      
      logs.push({
        ...auditLog,
        id: auditLogId,
      });
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    } catch (e) {
      console.error('Error guardando log de auditoría en localStorage:', e);
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
  } else {
    // Fallback a localStorage
    if (typeof window === 'undefined') return [];
    
    try {
      const STORAGE_KEY = 'chillapp_audit_logs';
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Error cargando logs de auditoría:', e);
      return [];
    }
  }
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
    // Fallback a localStorage
    if (typeof window === 'undefined') return;
    
    const STORAGE_KEY = 'chillapp_audit_logs';
    const stored = localStorage.getItem(STORAGE_KEY);
    const logs: AuditLog[] = stored ? JSON.parse(stored) : [];
    
    const logIndex = logs.findIndex(l => l.id === auditLogId);
    if (logIndex === -1) {
      throw new Error('Log de auditoría no encontrado');
    }
    
    const log = logs[logIndex];
    if (log.reverted) {
      throw new Error('Este cambio ya fue revertido');
    }
    
    // Revertir acción
    const data = await loadData();
    
    if (log.action === 'deleted' && log.studentData) {
      // Restaurar estudiante
      data.students.push(log.studentData);
    } else if (log.action === 'created') {
      // Eliminar estudiante
      data.students = data.students.filter(s => s.id !== log.studentId);
    }
    
    await saveData(data);
    
    // Marcar como revertido
    logs[logIndex].reverted = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  }
}

