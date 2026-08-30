/**
 * Parse rooster-Excel (export “Lessenroosters … - leerkrachten.xlsx”) → Timetable slots.
 * Verwacht per klas één blad: Lesuur | Maandag … Vrijdag, uren 1–7.
 * Slot key = `${dayIndex}_${hour}` (zelfde als lib/timetables).
 *
 * Gebruikt `xlsx` (browser-safe), niet exceljs — exceljs laat de Vercel-build crashen.
 */

import * as XLSX from 'xlsx';
import type { Timetable, TimetableSlots } from '@/types';
import { slotKey } from './timetables';

export type RoosterImportResult = {
  year: string | null;
  timetables: Array<Pick<Timetable, 'klas' | 'slots'>>;
  warnings: string[];
  pageCount: number;
  source: 'pdf' | 'excel';
};

const SKIP_SHEETS = new Set(['leerkrachten', 'alle roosters', '_info']);

const DAY_ALIASES: Array<{ dayIndex: number; names: string[] }> = [
  { dayIndex: 0, names: ['maandag', 'ma', 'mon'] },
  { dayIndex: 1, names: ['dinsdag', 'di', 'tue'] },
  { dayIndex: 2, names: ['woensdag', 'wo', 'wed'] },
  { dayIndex: 3, names: ['donderdag', 'do', 'thu'] },
  { dayIndex: 4, names: ['vrijdag', 'vr', 'fri'] },
];

function cellText(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

function mapDayColumns(headerRow: unknown[]): Map<number, number> {
  const map = new Map<number, number>();
  headerRow.forEach((raw, i) => {
    const h = cellText(raw).toLowerCase().replace(/\./g, '');
    if (!h) return;
    for (const day of DAY_ALIASES) {
      if (day.names.includes(h)) {
        map.set(i, day.dayIndex);
        break;
      }
    }
  });
  return map;
}

function findHourColumn(headerRow: unknown[]): number {
  const idx = headerRow.findIndex((h) => /lesuur|uur|hour/i.test(cellText(h)));
  return idx >= 0 ? idx : 0;
}

export async function parseRoosterExcelBytes(
  data: ArrayBuffer | Uint8Array
): Promise<RoosterImportResult> {
  const buf = data instanceof Uint8Array ? data : new Uint8Array(data);
  const workbook = XLSX.read(buf, { type: 'array' });

  const warnings: string[] = [];
  const timetables: Array<Pick<Timetable, 'klas' | 'slots'>> = [];
  let year: string | null = null;

  if (workbook.SheetNames.includes('_info')) {
    const infoRows = XLSX.utils.sheet_to_json<(string | number)[]>(
      workbook.Sheets._info,
      { header: 1, defval: '', raw: false }
    );
    for (const row of infoRows) {
      const label = cellText(row?.[0]).toLowerCase();
      const val = cellText(row?.[1]);
      if (label.includes('schooljaar') && /^\d{4}\s*[-/]\s*\d{4}$/.test(val)) {
        year = val.replace(/\s*\/\s*/, '-').replace(/\s+/g, '');
      }
    }
  }

  for (const name of workbook.SheetNames) {
    if (!name || SKIP_SHEETS.has(name.toLowerCase())) continue;
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: '',
      raw: false,
    });
    if (!rows.length) {
      warnings.push(`Blad "${name}": leeg — overgeslagen.`);
      continue;
    }

    const header = rows[0] || [];
    const dayCols = mapDayColumns(header);
    if (dayCols.size < 5) {
      warnings.push(`Blad "${name}": geen volledige weekdagen in koprij — overgeslagen.`);
      continue;
    }

    const hourCol = findHourColumn(header);
    const slots: TimetableSlots = {};
    let filled = 0;

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const hour = Number(cellText(row[hourCol]));
      if (!Number.isInteger(hour) || hour < 1 || hour > 7) continue;

      for (const [col, dayIndex] of dayCols) {
        const teacher = cellText(row[col]);
        if (!teacher || teacher === '—' || teacher === '-') continue;
        if (/^samengevoegd|^opmerking/i.test(teacher)) continue;
        slots[slotKey(dayIndex, hour)] = teacher;
        filled += 1;
      }
    }

    if (filled === 0) {
      warnings.push(`Blad "${name}": geen docenten gevonden.`);
      continue;
    }

    timetables.push({ klas: name, slots });
  }

  timetables.sort((a, b) => a.klas.localeCompare(b.klas, 'nl'));

  if (!timetables.length) {
    warnings.push(
      'Geen roosters in dit Excel-bestand. Verwacht één blad per klas met kolommen Lesuur + Maandag…Vrijdag.'
    );
  }

  return {
    year,
    timetables,
    warnings,
    pageCount: timetables.length,
    source: 'excel',
  };
}
