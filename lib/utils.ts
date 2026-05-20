import { ChillOutEntry, DailyRecord, WeeklyTotal, Student, ChillOutType } from '@/types';

export function formatDate(date: Date | string): string {
  if (typeof date === 'string') {
    return date;
  }
  return date.toISOString().split('T')[0];
}

export function getDayName(date: Date): string {
  const days = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
  return days[date.getDay()];
}

/** Parseert record-datum (verwacht YYYY-MM-DD) zonder timezone-shift */
export function parseRecordDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const d = new Date(`${dateStr}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Maximum chill-outs per lesuur (zelfde als Dagelijks UI) */
export const MAX_CHILLOUTS_PER_HOUR = 3;

export type ChillOutCounts = {
  total: number;
  vr: number;
  vl: number;
  generic: number;
};

export function emptyChillOutCounts(): ChillOutCounts {
  return { total: 0, vr: 0, vl: 0, generic: 0 };
}

/** Normaliseer type uit DB (bv. "vr", lege string) naar VR | VL | null */
export function normalizeChillOutType(raw: unknown): ChillOutType | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'string') return null;
  const t = raw.trim().toUpperCase();
  if (t === 'VR') return 'VR';
  if (t === 'VL') return 'VL';
  return null;
}

/** Alleen echte chill-out entries tellen (geen lege {} uit corrupte imports) */
function isValidArrayEntry(entry: unknown): entry is { type?: unknown; count?: number } {
  if (!entry || typeof entry !== 'object') return false;
  const e = entry as { type?: unknown; count?: number };
  const hasTypeField = 'type' in e;
  const hasCountField = 'count' in e;
  if (!hasTypeField && !hasCountField) return false;
  if (hasCountField) {
    const n = Number(e.count);
    if (!Number.isFinite(n) || n <= 0) return false;
  }
  return true;
}

/**
 * Eén bron van waarheid — zelfde regels als Dagelijks:
 * - Array: precies 1 chill-out per element (array.length), negeer count > 1 op elementen
 * - Legacy object { count, type }: tel count (max 3 per lesuur)
 */
export function forEachChillOutAtHour(
  slot: unknown,
  onEntry: (type: ChillOutType | null) => void
): void {
  if (!slot) return;
  if (Array.isArray(slot)) {
    let n = 0;
    for (const entry of slot) {
      if (n >= MAX_CHILLOUTS_PER_HOUR) break;
      if (!isValidArrayEntry(entry)) continue;
      const type = normalizeChillOutType(
        typeof entry === 'object' && entry !== null && 'type' in entry
          ? (entry as { type: unknown }).type
          : null
      );
      onEntry(type);
      n += 1;
    }
    return;
  }
  if (typeof slot === 'object' && slot !== null && 'count' in slot) {
    const old = slot as { count: number; type?: unknown };
    const n = Math.min(
      MAX_CHILLOUTS_PER_HOUR,
      Math.max(0, Number(old.count) || 0)
    );
    const type = normalizeChillOutType(old.type);
    for (let i = 0; i < n; i++) onEntry(type);
  }
}

export function addChillOutCount(counts: ChillOutCounts, type: ChillOutType | null): void {
  counts.total += 1;
  if (type === 'VR') counts.vr += 1;
  else if (type === 'VL') counts.vl += 1;
  else counts.generic += 1;
}

/** Tel chill-outs in één lesuur-slot */
export function countChillOutsInSlot(slot: unknown): ChillOutCounts {
  const counts = emptyChillOutCounts();
  forEachChillOutAtHour(slot, (type) => addChillOutCount(counts, type));
  return counts;
}

export function forEachHourInStudentEntries(
  studentEntries: Record<string | number, unknown> | undefined,
  onHour: (hour: number, slot: ChillOutEntry[]) => void
): void {
  if (!studentEntries) return;
  for (let hour = 1; hour <= 7; hour++) {
    const slot = getHourSlot(studentEntries, hour);
    if (slot.length > 0) onHour(hour, slot);
  }
}

/** Tel alle chill-outs van één student op één dag */
export function countChillOutsInStudentEntries(
  studentEntries: Record<string | number, unknown> | undefined
): ChillOutCounts {
  const counts = emptyChillOutCounts();
  forEachHourInStudentEntries(studentEntries, (_hour, slot) => {
    const slotCounts = countChillOutsInSlot(slot);
    counts.total += slotCounts.total;
    counts.vr += slotCounts.vr;
    counts.vl += slotCounts.vl;
    counts.generic += slotCounts.generic;
  });
  return counts;
}

/** Tel alle chill-outs in een dagrecord */
export function countChillOutsInRecord(record: DailyRecord): ChillOutCounts {
  const counts = emptyChillOutCounts();
  Object.values(record.entries).forEach((studentEntries) => {
    const studentCounts = countChillOutsInStudentEntries(
      studentEntries as Record<string | number, unknown>
    );
    counts.total += studentCounts.total;
    counts.vr += studentCounts.vr;
    counts.vl += studentCounts.vl;
    counts.generic += studentCounts.generic;
  });
  return counts;
}

/** Ruwe slot uit DB (kiest sterkste van hour vs "hour", geen dubbele telling) */
function pickRawHourSlot(
  studentEntries: Record<string | number, unknown>,
  hour: number
): unknown {
  const candidates: unknown[] = [];
  const a = studentEntries[hour];
  const b = studentEntries[String(hour)];
  if (a !== undefined && a !== null) candidates.push(a);
  if (b !== undefined && b !== null && b !== a) candidates.push(b);
  if (candidates.length === 0) return undefined;

  let best = candidates[0];
  let bestTotal = countChillOutsInSlot(best).total;
  for (let i = 1; i < candidates.length; i++) {
    const t = countChillOutsInSlot(candidates[i]).total;
    if (t > bestTotal) {
      best = candidates[i];
      bestTotal = t;
    }
  }
  return bestTotal > 0 ? best : undefined;
}

/**
 * Canoniek lesuur-slot (max 3 per uur, dubbele keys 2 + "2" samengevoegd).
 */
export function getHourSlot(
  studentEntries: Record<string | number, unknown> | undefined,
  hour: number
): ChillOutEntry[] {
  if (!studentEntries) return [];
  return normalizeSlotToArray(pickRawHourSlot(studentEntries, hour));
}

/** Converteer elk lesuur naar array van { count: 1, type } (canonieke opslag) */
export function normalizeSlotToArray(slot: unknown): ChillOutEntry[] {
  if (!slot) return [];
  const result: ChillOutEntry[] = [];

  if (Array.isArray(slot)) {
    for (const entry of slot) {
      if (!isValidArrayEntry(entry)) continue;
      const type = normalizeChillOutType(
        typeof entry === 'object' && entry !== null && 'type' in entry
          ? (entry as { type: unknown }).type
          : null
      );
      result.push({ count: 1, type });
    }
    return result.slice(0, MAX_CHILLOUTS_PER_HOUR);
  }

  if (typeof slot === 'object' && slot !== null && 'count' in slot) {
    const old = slot as { count: number; type?: unknown };
    const n = Math.min(
      MAX_CHILLOUTS_PER_HOUR,
      Math.max(0, Number(old.count) || 0)
    );
    const type = normalizeChillOutType(old.type);
    for (let i = 0; i < n; i++) result.push({ count: 1, type });
  }

  return result;
}

/** Opschonen: alleen lesuren 1–7, geen lege arrays, legacy → array */
export function sanitizeStudentEntries(
  raw: Record<string | number, unknown> | undefined
): Record<number, ChillOutEntry[]> {
  const out: Record<number, ChillOutEntry[]> = {};
  if (!raw) return out;

  for (let hour = 1; hour <= 7; hour++) {
    const arr = normalizeSlotToArray(pickRawHourSlot(raw, hour));
    if (arr.length > 0) out[hour] = arr;
  }
  return out;
}

export function sanitizeDailyRecord(record: DailyRecord): DailyRecord {
  const entries: DailyRecord['entries'] = {};
  for (const studentId of Object.keys(record.entries)) {
    entries[studentId] = sanitizeStudentEntries(
      record.entries[studentId] as Record<string | number, unknown>
    );
  }
  return { ...record, entries };
}

export function formatDateDisplay(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dayName = getDayName(dateObj);
  return `${day}-${month} ${dayName}`;
}

export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function getWeekStartDate(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Aanpassen zodat maandag de eerste dag is
  return new Date(d.setDate(diff));
}

export function calculateDailyTotals(record: DailyRecord, students: Student[]): {
  totals: { [hour: number]: number };
  vr: { [hour: number]: number };
  vl: { [hour: number]: number };
} {
  const totals: { [hour: number]: number } = {};
  const vr: { [hour: number]: number } = {};
  const vl: { [hour: number]: number } = {};

  // Initialiseer lesuren 1-7
  for (let hour = 1; hour <= 7; hour++) {
    totals[hour] = 0;
    vr[hour] = 0;
    vl[hour] = 0;
  }

  Object.keys(record.entries).forEach((studentId) => {
    const studentEntries = record.entries[studentId] as Record<string | number, unknown>;
    forEachHourInStudentEntries(studentEntries, (hour, slot) => {
      forEachChillOutAtHour(slot, (type) => {
        totals[hour] = (totals[hour] || 0) + 1;
        if (type === 'VR') vr[hour] = (vr[hour] || 0) + 1;
        else if (type === 'VL') vl[hour] = (vl[hour] || 0) + 1;
      });
    });
  });

  return { totals, vr, vl };
}

export function calculateWeeklyTotals(
  weekNumber: number,
  startDate: Date,
  dailyRecords: { [date: string]: DailyRecord },
  students: Student[]
): WeeklyTotal {
  const totals: WeeklyTotal['totals'] = {};
  const weekDays = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag'];
  
  // Verkrijg alle unieke klassen
  const klassen = [...new Set(students.map(s => s.klas))];
  
  // Initialiseer structuur
  klassen.forEach(klas => {
    totals[klas] = {};
    weekDays.forEach(day => {
      totals[klas][day] = { total: 0, vr: 0, vl: 0 };
    });
  });

  // Bereken totalen per dag
  for (let i = 0; i < 5; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    const dateStr = formatDate(currentDate);
    const record = dailyRecords[dateStr];
    
    if (record) {
      const dayName = weekDays[i];
      const dailyTotals = calculateDailyTotals(record, students);
      
      // Groepeer per klas
      klassen.forEach(klas => {
        const klasStudents = students.filter(s => s.klas === klas);
        let klasTotal = 0;
        let klasVR = 0;
        let klasVL = 0;
        
      klasStudents.forEach((student) => {
        const c = countChillOutsInStudentEntries(
          record.entries[student.id] as Record<string | number, unknown> | undefined
        );
        klasTotal += c.total;
        klasVR += c.vr;
        klasVL += c.vl;
      });
        
        totals[klas][dayName] = {
          total: klasTotal,
          vr: klasVR,
          vl: klasVL,
        };
      });
    }
  }

  return {
    weekNumber,
    startDate: formatDate(startDate),
    totals,
  };
}

export function calculateWeeklyTotalsByStudent(
  weekNumber: number,
  startDate: Date,
  dailyRecords: { [date: string]: DailyRecord },
  students: Student[]
): { [studentId: string]: { name: string; klas: string; totals: { [day: string]: { total: number; vr: number; vl: number } } } } {
  const studentTotals: { [studentId: string]: { name: string; klas: string; totals: { [day: string]: { total: number; vr: number; vl: number } } } } = {};
  const weekDays = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag'];
  
  // Inicializar estructura para cada estudiante
  students.forEach(student => {
    studentTotals[student.id] = {
      name: student.name,
      klas: student.klas,
      totals: {},
    };
    weekDays.forEach(day => {
      studentTotals[student.id].totals[day] = { total: 0, vr: 0, vl: 0 };
    });
  });

  // Calcular totales por estudiante y día
  for (let i = 0; i < 5; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    const dateStr = formatDate(currentDate);
    const record = dailyRecords[dateStr];
    
    if (record) {
      const dayName = weekDays[i];
      
      // Procesar cada estudiante
      students.forEach((student) => {
        const c = countChillOutsInStudentEntries(
          record.entries[student.id] as Record<string | number, unknown> | undefined
        );
        if (studentTotals[student.id]) {
          studentTotals[student.id].totals[dayName] = {
            total: c.total,
            vr: c.vr,
            vl: c.vl,
          };
        }
      });
    }
  }

  return studentTotals;
}

// Función para ordenar clases de manera inteligente (1ste jaar, 2de jaar, etc.)
export function sortKlassen(klassen: string[]): string[] {
  const sorted = [...klassen].sort((a, b) => {
    // Extraer números de patrones como "1ste jaar", "2de jaar", etc.
    const getYearNumber = (klas: string): number => {
      const match = klas.match(/(\d+)(ste|de|e)\s+jaar/i);
      if (match) {
        return parseInt(match[1], 10);
      }
      // Si no coincide con el patrón, devolver un número muy alto para ponerlo al final
      return 9999;
    };
    
    const yearA = getYearNumber(a);
    const yearB = getYearNumber(b);
    
    // Si ambos tienen año, ordenar por año
    if (yearA !== 9999 && yearB !== 9999) {
      return yearA - yearB;
    }
    
    // Si solo uno tiene año, el que tiene año va primero
    if (yearA !== 9999) return -1;
    if (yearB !== 9999) return 1;
    
    // Si ninguno tiene año, ordenar alfabéticamente
    return a.localeCompare(b, 'nl');
  });
  
  return sorted;
}

/** @deprecated Gebruik loadKlassenOrder / saveKlassenOrder uit lib/app-settings.ts */
export { applyKlassenOrder, loadKlassenOrder, saveKlassenOrder } from './app-settings';

