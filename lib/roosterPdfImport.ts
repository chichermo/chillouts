/**
 * Parse Untis/Stamina klasrooster-PDF (meerdere pagina's) → Timetable slots.
 * Slot key = `${dayIndex}_${hour}` met dayIndex 0=Ma … 4=Vr, hour 1–7.
 */

import type { Timetable, TimetableSlots } from '@/types';
import { cleanPersonNameText } from './studentImport';
import { slotKey } from './timetables';
import type { RoosterImportResult } from './roosterExcelImport';

export type RoosterPdfParseResult = Omit<RoosterImportResult, 'source'> & {
  source?: 'pdf';
};

type PdfTextItem = { str: string; x: number; y: number };

const DAY_HEADERS = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag'] as const;

function isRoomLabel(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  if (/^(KK|Water|Aarde|Lucht|Vuur|Lokaal)\b/i.test(t)) return true;
  if (/^\d+\s*[A-Za-zÀ-ÿ]/.test(t) && /\d/.test(t) && t.length <= 12) {
    // "3 Aarde" style rooms already covered; "Aarde 3" covered above
  }
  if (/^[A-Za-zÀ-ÿ]+\s+\d+$/i.test(t)) return true; // Aarde 3, Water 14
  if (/^KK\d+$/i.test(t)) return true;
  return false;
}

function isSubjectCode(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  // ALL CAPS / codes without lowercase letters (allow + & *)
  if (/^[A-Z][A-Z0-9+&*]{0,12}$/.test(t)) return true;
  if (/^(ECO&ICT|MOVE\+|FOOD\+|SCHAKE|EDULIFE|CDD|NCZ|RKG|LIFE|LEREN)$/i.test(t)) {
    return true;
  }
  return false;
}

function looksLikeTeacher(s: string): boolean {
  const t = s.trim();
  if (!t || t.length < 2) return false;
  if (isRoomLabel(t) || isSubjectCode(t)) return false;
  if (/^\d+$/.test(t)) return false;
  if (/^\d{1,2}:\d{2}$/.test(t)) return false;
  // Names usually have lowercase or end with .
  if (/[a-zà-ÿ]/.test(t) || /\.$/.test(t) || t.startsWith('*')) return true;
  // "Stephanie" without period still ok if not subject
  if (/^[A-ZÀ-Ÿ*][a-zà-ÿ]/.test(t)) return true;
  return false;
}

export function normalizeTeacherName(raw: string): string {
  return cleanPersonNameText(
    String(raw || '')
      .replace(/^\*+/, '')
      .replace(/\.+$/, '')
  );
}

/** "1Aarde" / "1Aard" → "1 Aarde" when possible */
export function normalizeKlasFromPdf(raw: string): string {
  let s = String(raw || '').trim();
  if (!s) return '';
  // Prefer full name over short Untis code if both present elsewhere
  s = s.replace(/^(\d+)([A-Za-zÀ-ÿ])/, '$1 $2');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

function pickKlasName(items: PdfTextItem[]): string {
  const top = items.filter((i) => i.y > 500);
  const candidates = top
    .map((i) => i.str.trim())
    .filter((s) => /^\d/.test(s) && /[A-Za-zÀ-ÿ]/.test(s))
    .filter((s) => !/Rooster|Untis|Stamina|Element/i.test(s));

  if (!candidates.length) return '';

  // Prefer longer non-abbreviation (1Aarde over 1Aard, 1Aarde+ over 1Aard)
  candidates.sort((a, b) => b.length - a.length);
  return normalizeKlasFromPdf(candidates[0]);
}

function pickYear(items: PdfTextItem[]): string | null {
  for (const it of items) {
    const m = it.str.match(/Rooster\s+(\d{4})\s*[\/\-]\s*(\d{4})/i);
    if (m) return `${m[1]}-${m[2]}`;
    const m2 = it.str.match(/\b(\d{4})\s*[\/\-]\s*(\d{4})\b/);
    if (m2 && Number(m2[2]) === Number(m2[1]) + 1) return `${m2[1]}-${m2[2]}`;
  }
  return null;
}

function dayBounds(dayItems: PdfTextItem[]): Array<{ dayIndex: number; left: number; right: number }> {
  const xs = dayItems.map((d) => d.x);
  return dayItems.map((d, i) => {
    const left = i === 0 ? d.x - 30 : (xs[i - 1] + d.x) / 2;
    const right = i === xs.length - 1 ? d.x + 140 : (d.x + xs[i + 1]) / 2;
    return { dayIndex: i, left, right };
  });
}

function teacherInCell(items: PdfTextItem[], hourY: number, left: number, right: number): string {
  const band = items
    .filter((i) => i.x >= left && i.x < right && i.y <= hourY + 6 && i.y >= hourY - 46)
    .sort((a, b) => b.y - a.y || a.x - b.x);

  const teachers = band.filter((i) => looksLikeTeacher(i.str));
  if (teachers.length) {
    // Closest to the hour row (highest y still below/near hour)
    teachers.sort((a, b) => b.y - a.y);
    return normalizeTeacherName(teachers[0].str);
  }
  return '';
}

async function loadPdfjs() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;
  }
  return pdfjs;
}

export async function parseRoosterPdfBytes(
  data: ArrayBuffer | Uint8Array
): Promise<RoosterPdfParseResult> {
  const pdfjs = await loadPdfjs();
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const doc = await pdfjs.getDocument({ data: bytes, useSystemFonts: true }).promise;
  const warnings: string[] = [];
  const byKlas = new Map<string, TimetableSlots>();
  let year: string | null = null;

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items: PdfTextItem[] = [];
    for (const raw of content.items) {
      if (!('str' in raw) || typeof raw.str !== 'string') continue;
      const str = raw.str.trim();
      if (!str) continue;
      items.push({
        str,
        x: raw.transform[4],
        y: raw.transform[5],
      });
    }

    if (!year) year = pickYear(items);

    const dayHeaderItems = DAY_HEADERS.map((name) => items.find((i) => i.str === name)).filter(
      Boolean
    ) as PdfTextItem[];

    if (dayHeaderItems.length < 5) {
      warnings.push(`Pagina ${p}: geen volledige dag-koppen gevonden — overgeslagen.`);
      continue;
    }

    const klas = pickKlasName(items);
    if (!klas) {
      warnings.push(`Pagina ${p}: geen klasnaam gevonden — overgeslagen.`);
      continue;
    }

    const bounds = dayBounds(dayHeaderItems);
    const hourMarks = items.filter((i) => /^[1-7]$/.test(i.str) && i.x < 90);
    if (!hourMarks.length) {
      warnings.push(`Pagina ${p} (${klas}): geen lesuren 1–7 gevonden.`);
      continue;
    }

    const slots: TimetableSlots = { ...(byKlas.get(klas) || {}) };
    let filled = 0;
    for (const mark of hourMarks) {
      const hour = Number(mark.str);
      for (const b of bounds) {
        const teacher = teacherInCell(items, mark.y, b.left, b.right);
        if (!teacher) continue;
        slots[slotKey(b.dayIndex, hour)] = teacher;
        filled += 1;
      }
    }

    if (filled === 0) {
      warnings.push(`Pagina ${p} (${klas}): geen docenten herkend.`);
      continue;
    }

    byKlas.set(klas, slots);
  }

  const timetables = [...byKlas.entries()].map(([klas, slots]) => ({ klas, slots }));
  if (!timetables.length) {
    warnings.push('Geen roosters kunnen extraheren uit deze PDF.');
  }

  return {
    year,
    timetables,
    warnings,
    pageCount: doc.numPages,
    source: 'pdf',
  };
}
