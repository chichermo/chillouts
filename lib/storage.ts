import { AppData, Student, DailyRecord } from '@/types';

const STORAGE_KEY = 'chillapp_data';

export function loadData(): AppData {
  if (typeof window === 'undefined') {
    return {
      students: [],
      dailyRecords: {},
      weeklyTotals: {},
    };
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Error loading data:', e);
    }
  }

  // Standaard initiële gegevens
  return {
    students: [],
    dailyRecords: {},
    weeklyTotals: {},
  };
}

export function saveData(data: AppData): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving data:', e);
  }
}

export function addStudent(student: Omit<Student, 'id'>): Student {
  const data = loadData();
  const newStudent: Student = {
    ...student,
    id: `student_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };
  
  data.students.push(newStudent);
  saveData(data);
  return newStudent;
}

export function updateStudent(studentId: string, updates: Partial<Student>): void {
  const data = loadData();
  const index = data.students.findIndex(s => s.id === studentId);
  if (index !== -1) {
    data.students[index] = { ...data.students[index], ...updates };
    saveData(data);
  }
}

export function deleteStudent(studentId: string): void {
  const data = loadData();
  data.students = data.students.filter(s => s.id !== studentId);
  saveData(data);
}

export function saveDailyRecord(record: DailyRecord): void {
  const data = loadData();
  data.dailyRecords[record.date] = record;
  saveData(data);
}

export function getDailyRecord(date: string): DailyRecord | null {
  const data = loadData();
  return data.dailyRecords[date] || null;
}

