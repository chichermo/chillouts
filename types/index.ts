// Tipos para la aplicación Chill-outs

export type ChillOutType = 'VR' | 'VL' | null; // null = chill-out genérico sin tipo específico

export interface ChillOutEntry {
  count: number; // 0-3
  type: ChillOutType;
}

export interface Student {
  id: string;
  name: string;
  klas: string; // e.g., "1 Aarde", "1 Lucht"
  status: 'Actief' | 'Inactief';
}

export interface DailyRecord {
  date: string; // formato "YYYY-MM-DD"
  dayName: string; // "Ma", "Di", "Wo", etc.
  entries: {
    [studentId: string]: {
      [hour: number]: ChillOutEntry[]; // Array de chill-outs (máximo 3) por hora
    };
  };
}

export interface WeeklyTotal {
  weekNumber: number;
  startDate: string;
  totals: {
    [klas: string]: {
      [day: string]: {
        total: number;
        vr: number;
        vl: number;
      };
    };
  };
}

export interface AppData {
  students: Student[];
  dailyRecords: { [date: string]: DailyRecord };
  weeklyTotals: { [weekNumber: number]: WeeklyTotal };
}

