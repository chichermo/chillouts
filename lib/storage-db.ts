import { supabase, isSupabaseEnabled } from './supabase';
import { AppData, Student, DailyRecord } from '@/types';

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
  data.students = data.students.filter(s => s.id !== studentId);
  await saveData(data);
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

