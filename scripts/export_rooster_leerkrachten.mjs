/**
 * Extraheer leerkrachtnamen uit Untis/Stamina klasrooster-PDF.
 * Regel: alleen cursieve (italic) tekst die NIET onderstreept is.
 * Onderstreepte tekst = lokaal → nooit als leerkracht gebruiken.
 *
 * Gebruik:
 *   node scripts/export_rooster_leerkrachten.mjs [pad/naar.pdf] [pad/naar.xlsx]
 */
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const DAY_HEADERS = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag'];

const DEFAULT_PDF =
  'C:/Users/liesb/OneDrive/Element/Roosters/2026-2027/Lessenroosters klassen.pdf';

const pdfPath = process.argv[2] || DEFAULT_PDF;
const outPath =
  process.argv[3] ||
  path.join(
    path.dirname(pdfPath),
    path.basename(pdfPath, path.extname(pdfPath)) + ' - leerkrachten.xlsx'
  );

/** Onderstreept in de PDF = lokaal. Nooit als leerkracht. */
function looksLikeRoom(s) {
  const t = String(s || '').trim();
  if (!t) return false;
  if (/^\d/.test(t)) return true; // 2-Water 07, 5-KK2, 5-KK/ZWEM, 1Aarde
  if (/^(KK|Water|Aarde|Lucht|Vuur|Lokaal)\b/i.test(t)) return true;
  if (/^[A-Za-zÀ-ÿ]+\s+\d+$/i.test(t)) return true; // Water 14
  if (/^[A-Za-z]+-\d/.test(t)) return true;
  if (/\bKK\d*\b/i.test(t) || /ZWEM/i.test(t)) return true;
  return false;
}

function looksLikeTeacher(s) {
  const t = String(s || '').trim();
  if (!t || t === '?') return false;
  if (looksLikeRoom(t)) return false;
  if (/^\d+$/.test(t) || /^\d{1,2}:\d{2}$/.test(t)) return false;
  if (/^[A-Z][A-Z0-9+&.*]{1,12}$/.test(t)) return false;
  if (/[a-zà-ÿ]/.test(t) || /\.$/.test(t) || t.startsWith('*')) return true;
  if (/^[A-ZÀ-Ÿ*][a-zà-ÿ]/.test(t)) return true;
  return false;
}

function looksLikeSubject(s) {
  const t = String(s || '').trim().replace(/^\./, '');
  return /^[A-Z][A-Z0-9+&*]{1,12}$/.test(t);
}

function normalizeTeacherName(raw) {
  return String(raw || '')
    .replace(/^\*+/, '')
    .replace(/\.+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeKlas(raw) {
  let s = String(raw || '').trim();
  if (!s) return '';
  s = s.replace(/^(\d+)([A-Za-zÀ-ÿ])/, '$1 $2');
  return s.replace(/\s+/g, ' ').trim();
}

function pickKlas(items) {
  const top = items.filter((i) => i.y > 500);
  const candidates = top
    .map((i) => i.str.trim())
    .filter((s) => /^\d/.test(s) && /[A-Za-zÀ-ÿ]/.test(s))
    .filter((s) => !/Rooster|Untis|Stamina|Element/i.test(s));
  if (!candidates.length) return '';
  candidates.sort((a, b) => b.length - a.length);
  return normalizeKlas(candidates[0]);
}

function pickYear(items) {
  for (const it of items) {
    const m = it.str.match(/Rooster\s+(\d{4})\s*[\/\-]\s*(\d{4})/i);
    if (m) return `${m[1]}-${m[2]}`;
  }
  return null;
}

function dayBounds(dayItems) {
  const xs = dayItems.map((d) => d.x);
  return dayItems.map((d, i) => {
    const left = i === 0 ? d.x - 30 : (xs[i - 1] + d.x) / 2;
    const right = i === xs.length - 1 ? d.x + 140 : (d.x + xs[i + 1]) / 2;
    return { dayIndex: i, left, right, name: DAY_HEADERS[i] };
  });
}

/** Font met meeste leerkrachtnamen (niet lokalen, niet vakcodes) = Arial Italic. */
function findItalicFont(items) {
  const votes = new Map();
  for (const it of items) {
    const font = it.fontName || '?';
    if (!votes.has(font)) votes.set(font, { teacher: 0, subject: 0, room: 0 });
    const v = votes.get(font);
    if (looksLikeRoom(it.str)) v.room += 1;
    else if (looksLikeTeacher(it.str)) v.teacher += 1;
    else if (looksLikeSubject(it.str)) v.subject += 1;
  }
  let best = null;
  for (const [font, v] of votes) {
    if (v.teacher <= 0) continue;
    if (v.teacher <= v.subject || v.teacher <= v.room) continue;
    if (!best || v.teacher > best.teacher) best = { font, ...v };
  }
  return best?.font || null;
}

function teacherInCell(italicItems, hourY, left, right) {
  const band = italicItems
    .filter((i) => i.x >= left && i.x < right && i.y <= hourY + 6 && i.y >= hourY - 46)
    .filter((i) => looksLikeTeacher(i.str) && !looksLikeRoom(i.str))
    .sort((a, b) => b.y - a.y || a.x - b.x);
  const names = [];
  for (const it of band) {
    const n = normalizeTeacherName(it.str);
    if (n && !names.includes(n)) names.push(n);
  }
  return names.join(' / ');
}

/** Volledige namen uit onderschriften: "Stephanie, SCHAKEL, 2-Water 04" */
function collectFullNames(items) {
  const names = new Set();
  for (const it of items) {
    const m = it.str.match(
      /^([A-ZÀ-Ÿ][A-Za-zÀ-ÿ'’\-]+(?:\s+[A-ZÀ-Ÿ]\.?)?)\s*,\s*[A-Z]/
    );
    if (m) names.add(normalizeTeacherName(m[1]));
  }
  return names;
}

function expandName(shortName, fullNames) {
  const short = normalizeTeacherName(shortName);
  if (!short) return short;
  if (fullNames.has(short)) return short;
  // Langste volledige naam waarvan de short een prefix is (Stephani → Stephanie)
  let best = '';
  for (const full of fullNames) {
    if (full === short) return full;
    if (full.startsWith(short) && full.length > best.length) best = full;
    // "Lisa F" vs "Lisa"
    const shortBase = short.replace(/\s+[A-Z]\.?$/, '');
    const fullBase = full.replace(/\s+[A-Z]\.?$/, '');
    if (shortBase === fullBase && full.length >= short.length && full.length > best.length) {
      best = full;
    }
  }
  return best || short;
}

/** App-namen: Food-Move→Lucht, Food-Create→Vuur; alle 2 Aarde* → één "2 Aarde". */
function canonicalizeKlas(raw) {
  let s = String(raw || '').trim().replace(/\s+/g, ' ');
  if (!s) return '';
  // Geen leerlingen
  if (/move\s*&\s*go/i.test(s) || /move&go/i.test(s)) return null;
  // 2 B Food - Move → 2 Lucht
  if (/^2\b.*\bfood\b.*\bmove\b/i.test(s) && !/create/i.test(s)) return '2 Lucht';
  // 2 B Food - Create → 2 Vuur
  if (/^2\b.*\bfood\b.*\bcreate\b/i.test(s)) return '2 Vuur';
  // 2 Aarde Art / Bus / Move → één rooster
  if (/^2\s*aarde/i.test(s)) return '2 Aarde';
  s = s.replace(/Move\s*&\s*Play/gi, 'MovePlay');
  return s;
}

/** Volgorde bij samenvoegen 2 Aarde-varianten: Bus, Art, Move (bv. Jutta / Koen). */
function aardeVariantOrder(rawKlas) {
  const s = String(rawKlas || '').toLowerCase();
  if (/bus/.test(s)) return 0;
  if (/art/.test(s)) return 1;
  if (/move/.test(s)) return 2;
  return 9;
}

function splitTeachers(cell) {
  return String(cell || '')
    .split(/\s*\/\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function mergeTeacherCells(...cells) {
  const seen = new Set();
  const out = [];
  for (const cell of cells) {
    for (const name of splitTeachers(cell)) {
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(name);
    }
  }
  return out.join(' / ');
}

/**
 * Hernoem/filter klassen en merge meerdere PDF-pagina's met dezelfde eindnaam
 * (o.a. 2 Aarde Art+Bus+Move → één rooster met "Jutta / Koen").
 */
function normalizeAndMergePages(pages) {
  const prepared = [];
  for (const pg of pages) {
    if (!pg.klas || pg.warning === 'geen dag-koppen') continue;
    const canonical = canonicalizeKlas(pg.klas);
    if (canonical == null) continue; // Move&Go e.d.
    prepared.push({
      ...pg,
      klas: canonical,
      _mergeOrder: aardeVariantOrder(pg.klas),
      _sourceKlas: pg.klas,
    });
  }

  prepared.sort((a, b) => {
    const k = a.klas.localeCompare(b.klas, 'nl');
    if (k !== 0) return k;
    if (a._mergeOrder !== b._mergeOrder) return a._mergeOrder - b._mergeOrder;
    return a.page - b.page;
  });

  const byKlas = new Map();
  for (const pg of prepared) {
    const existing = byKlas.get(pg.klas);
    if (!existing) {
      byKlas.set(pg.klas, {
        page: pg.page,
        pages: [pg.page],
        klas: pg.klas,
        slots: { ...pg.slots },
        hours: [...(pg.hours || [])],
        warning: pg.warning,
        sources: [pg._sourceKlas],
      });
      continue;
    }
    existing.pages.push(pg.page);
    existing.sources.push(pg._sourceKlas);
    for (const hour of pg.hours || []) {
      if (!existing.hours.includes(hour)) existing.hours.push(hour);
    }
    existing.hours.sort((a, b) => a - b);
    const keys = new Set([...Object.keys(existing.slots), ...Object.keys(pg.slots)]);
    for (const key of keys) {
      existing.slots[key] = mergeTeacherCells(existing.slots[key], pg.slots[key]);
    }
    if (!existing.warning) existing.warning = pg.warning;
  }

  return [...byKlas.values()];
}

async function parsePdf(pdfBytes) {
  const doc = await pdfjs.getDocument({
    data: pdfBytes,
    useSystemFonts: true,
    verbosity: 0,
  }).promise;

  const fullNames = new Set();
  const pages = [];
  let year = null;

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent({ disableCombineTextItems: true });
    const items = [];
    for (const raw of content.items) {
      if (!('str' in raw) || typeof raw.str !== 'string') continue;
      const str = raw.str.trim();
      if (!str) continue;
      items.push({
        str,
        x: raw.transform[4],
        y: raw.transform[5],
        fontName: raw.fontName || '',
      });
    }

    for (const n of collectFullNames(items)) fullNames.add(n);
    if (!year) year = pickYear(items);

    const dayHeaderItems = DAY_HEADERS.map((name) =>
      items.find((i) => i.str === name)
    ).filter(Boolean);

    if (dayHeaderItems.length < 5) {
      pages.push({ page: p, warning: 'geen dag-koppen', klas: '', slots: {}, hours: [] });
      continue;
    }

    const klas = pickKlas(items);
    const italicFont = findItalicFont(items);
    const italicItems = italicFont
      ? items.filter((i) => i.fontName === italicFont)
      : [];

    const bounds = dayBounds(dayHeaderItems);
    const hourMarks = items
      .filter((i) => /^[1-7]$/.test(i.str) && i.x < 90)
      .sort((a, b) => b.y - a.y);

    const slots = {};
    const hours = [];
    for (const mark of hourMarks) {
      const hour = Number(mark.str);
      if (!hours.includes(hour)) hours.push(hour);
      for (const b of bounds) {
        const teacher = teacherInCell(italicItems, mark.y, b.left, b.right);
        if (!teacher) continue;
        slots[`${b.dayIndex}-${hour}`] = teacher;
      }
    }
    hours.sort((a, b) => a - b);

    pages.push({
      page: p,
      klas: klas || `Pagina ${p}`,
      italicFont,
      slots,
      hours,
      warning: !italicFont
        ? 'geen italic font'
        : Object.keys(slots).length === 0
          ? 'geen leerkrachten'
          : null,
    });
  }

  // Expand truncated names (also in "Zoe / Stephani" cells)
  for (const pg of pages) {
    for (const key of Object.keys(pg.slots)) {
      pg.slots[key] = pg.slots[key]
        .split(/\s*\/\s*/)
        .map((part) => expandName(part, fullNames))
        .filter(Boolean)
        .join(' / ');
    }
  }

  const merged = normalizeAndMergePages(pages);

  return {
    year,
    pages: merged,
    fullNames: [...fullNames].sort((a, b) => a.localeCompare(b, 'nl')),
  };
}

function safeSheetName(name, used) {
  let base = String(name || 'Klas')
    .replace(/[\\/?*:\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 28);
  if (!base) base = 'Klas';
  let candidate = base;
  let n = 2;
  while (used.has(candidate.toLowerCase())) {
    candidate = `${base.slice(0, 25)} ${n++}`;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

async function writeExcel(result, dest) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Chill-outs rooster export';
  wb.created = new Date();

  // Overzicht unieke namen
  const overview = wb.addWorksheet('Leerkrachten', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  overview.columns = [
    { header: 'Leerkracht', key: 'name', width: 24 },
    { header: 'Bron', key: 'bron', width: 40 },
  ];
  const nameSet = new Map();
  for (const pg of result.pages) {
    for (const t of Object.values(pg.slots)) {
      if (!t) continue;
      for (const part of t.split(/\s*\/\s*/).map((s) => s.trim()).filter(Boolean)) {
        if (!nameSet.has(part)) nameSet.set(part, new Set());
        nameSet.get(part).add(pg.klas);
      }
    }
  }
  for (const name of [...nameSet.keys()].sort((a, b) => a.localeCompare(b, 'nl'))) {
    overview.addRow({
      name,
      bron: [...nameSet.get(name)].sort().join(', '),
    });
  }
  overview.getRow(1).font = { bold: true };

  // Samenvatting alle slots
  const all = wb.addWorksheet('Alle roosters', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  all.columns = [
    { header: 'Klas', key: 'klas', width: 16 },
    { header: 'Pagina', key: 'page', width: 8 },
    { header: 'Lesuur', key: 'hour', width: 8 },
    ...DAY_HEADERS.map((d, i) => ({ header: d, key: `d${i}`, width: 22 })),
  ];
  all.getRow(1).font = { bold: true };

  const usedNames = new Set(['leerkrachten', 'alle roosters']);

  for (const pg of result.pages) {
    if (!pg.klas || pg.warning === 'geen dag-koppen') continue;
    const hours = pg.hours.length ? pg.hours : [1, 2, 3, 4, 5, 6, 7];
    const pageLabel = Array.isArray(pg.pages) ? pg.pages.join(',') : String(pg.page);

    for (const hour of hours) {
      const row = { klas: pg.klas, page: pageLabel, hour };
      for (let d = 0; d < 5; d++) {
        row[`d${d}`] = pg.slots[`${d}-${hour}`] || '';
      }
      all.addRow(row);
    }

    const sheet = wb.addWorksheet(safeSheetName(pg.klas, usedNames), {
      views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }],
    });
    sheet.getCell(1, 1).value = 'Lesuur';
    sheet.getCell(1, 1).font = { bold: true };
    DAY_HEADERS.forEach((d, i) => {
      const cell = sheet.getCell(1, i + 2);
      cell.value = d;
      cell.font = { bold: true };
    });
    sheet.getColumn(1).width = 10;
    for (let i = 0; i < 5; i++) sheet.getColumn(i + 2).width = 22;

    hours.forEach((hour, rowIdx) => {
      sheet.getCell(rowIdx + 2, 1).value = hour;
      for (let d = 0; d < 5; d++) {
        const name = pg.slots[`${d}-${hour}`] || '';
        const cell = sheet.getCell(rowIdx + 2, d + 2);
        cell.value = name;
        if (name) cell.font = { italic: true };
      }
    });

    let noteRow = hours.length + 3;
    if (pg.sources && pg.sources.length > 1) {
      sheet.getCell(noteRow, 1).value =
        `Samengevoegd uit: ${[...new Set(pg.sources)].join(', ')}`;
      noteRow += 1;
    }
    if (pg.warning) {
      sheet.getCell(noteRow, 1).value = `Opmerking: ${pg.warning}`;
    }
  }

  // Meta
  const meta = wb.addWorksheet('_info');
  meta.getCell(1, 1).value = 'Bron-PDF';
  meta.getCell(1, 2).value = pdfPath;
  meta.getCell(2, 1).value = 'Schooljaar';
  meta.getCell(2, 2).value = result.year || '';
  meta.getCell(3, 1).value = 'Regel';
  meta.getCell(3, 2).value =
    'Cursief = leerkracht. Onderstreept = lokaal. 2 Aarde Art/Bus/Move samengevoegd met \" / \". 2 Food-Move→2 Lucht, 2 Food-Create→2 Vuur. Move&Go weggelaten.';
  meta.getCell(4, 1).value = 'Pagina\'s';
  meta.getCell(4, 2).value = result.pages.length;
  meta.getCell(5, 1).value = 'Unieke leerkrachten';
  meta.getCell(5, 2).value = nameSet.size;
  meta.getColumn(1).width = 22;
  meta.getColumn(2).width = 80;

  await wb.xlsx.writeFile(dest);
  return { teachers: nameSet.size, sheets: wb.worksheets.length };
}

async function main() {
  if (!fs.existsSync(pdfPath)) {
    console.error('PDF niet gevonden:', pdfPath);
    process.exit(1);
  }
  const bytes = new Uint8Array(fs.readFileSync(pdfPath));
  console.log('Lezen:', pdfPath);
  const result = await parsePdf(bytes);
  console.log('Schooljaar:', result.year);
  console.log('Pagina\'s:', result.pages.length);
  console.log(
    'Klassen:',
    result.pages.filter((p) => p.klas && !p.warning?.includes('dag')).map((p) => p.klas).join(', ')
  );

  const stats = await writeExcel(result, outPath);
  console.log('Geschreven:', outPath);
  console.log('Unieke leerkrachten:', stats.teachers, '| werkbladen:', stats.sheets);

  const warnings = result.pages.filter((p) => p.warning);
  if (warnings.length) {
    console.log('Waarschuwingen:');
    for (const w of warnings) console.log(`  p${w.page} ${w.klas}: ${w.warning}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
