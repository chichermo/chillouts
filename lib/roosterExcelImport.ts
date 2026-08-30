/**
 * Parse rooster-Excel (export “Lessenroosters … - leerkrachten.xlsx”) → Timetable slots.
 * Verwacht per klas één blad: Lesuur | Maandag … Vrijdag, uren 1–7.
 * Slot key = `${dayIndex}_${hour}` (zelfde als lib/timetables).
 */

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
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  if (typeof value === 'object' && value !== null && 'text' in value) {
    return String((value as { text?: unknown }).text ?? '').trim();
  }
  if (typeof value === 'object' && value !== null && 'richText' in value) {
    const rich = (value as { richText?: Array<{ text?: string }> }).richText || [];
    return rich.map((r) => r.text || '').join('').trim();
  }
  if (typeof value === 'object' && value !== null && 'result' in value) {
    return cellText((value as { result?: unknown }).result);
  }
  return String(value).trim();
}

function mapDayColumns(headerRow: string[]): Map<number, number> {
  // colIndex (1-based excel) -> dayIndex
  const map = new Map<number, number>();
  headerRow.forEach((raw, i) => {
    const h = raw.toLowerCase().replace(/\./g, '').trim();
    if (!h) return;
    for (const day of DAY_ALIASES) {
      if (day.names.includes(h)) {
        map.set(i + 1, day.dayIndex);
        break;
      }
    }
  });
  return map;
}

function findHourColumn(headerRow: string[]): number {
  const idx = headerRow.findIndex((h) => /lesuur|uur|hour/i.test(h.trim()));
  return idx >= 0 ? idx + 1 : 1;
}

export async function parseRoosterExcelBytes(
  data: ArrayBuffer | Uint8Array
): Promise<RoosterImportResult> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const buf = data instanceof Uint8Array ? data : new Uint8Array(data);
  // exceljs load accepts Buffer-like / ArrayBuffer
  await workbook.xlsx.load(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

  const warnings: string[] = [];
  const timetables: Array<Pick<Timetable, 'klas' | 'slots'>> = [];
  let year: string | null = null;

  const info = workbook.getWorksheet('_info');
  if (info) {
    info.eachRow((row) => {
      const label = cellText(row.getCell(1).value).toLowerCase();
      const val = cellText(row.getCell(2).value);
      if (label.includes('schooljaar') && /^\d{4}\s*[-/]\s*\d{4}$/.test(val)) {
        year = val.replace(/\s*\/\s*/, '-').replace(/\s+/g, '');
      }
    });
  }

  for (const sheet of workbook.worksheets) {
    const name = String(sheet.name || '').trim();
    if (!name || SKIP_SHEETS.has(name.toLowerCase())) continue;

    const headerCells: string[] = [];
    const headerRow = sheet.getRow(1);
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      headerCells[colNumber - 1] = cellText(cell.value);
    });

    const dayCols = mapDayColumns(headerCells);
    if (dayCols.size < 5) {
      warnings.push(`Blad "${name}": geen volledige weekdagen in koprij — overgeslagen.`);
      continue;
    }

    const hourCol = findHourColumn(headerCells);
    const slots: TimetableSlots = {};
    let filled = 0;

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const hourRaw = cellText(row.getCell(hourCol).value);
      const hour = Number(hourRaw);
      if (!Number.isInteger(hour) || hour < 1 || hour > 7) return;

      for (const [col, dayIndex] of dayCols) {
        const teacher = cellText(row.getCell(col).value);
        if (!teacher || teacher === '—' || teacher === '-') continue;
        // Sla notities onderaan over (geen lesuur)
        if (/^samengevoegd|^opmerking/i.test(teacher)) continue;
        slots[slotKey(dayIndex, hour)] = teacher;
        filled += 1;
      }
    });

    if (filled === 0) {
      warnings.push(`Blad "${name}": geen docenten gevonden.`);
      continue;
    }

    timetables.push({ klas: name, slots });
  }

  // Stabiele volgorde
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
