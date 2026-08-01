/** Exact header match (trim + case-insensitive). No fuzzy — "Naam" must not hit "Voornaam". */
export function cellExact(row: Record<string, unknown>, keys: string[]): string {
  const headers = Object.keys(row);
  for (const key of keys) {
    const hit = headers.find((k) => k.trim().toLowerCase() === key.toLowerCase());
    if (hit != null && row[hit] != null && String(row[hit]).trim() !== '') {
      return String(row[hit]).trim();
    }
  }
  return '';
}

/** Insert space in CamelCase glue: JanJanssen → Jan Janssen */
export function unglueCamelCase(value: string): string {
  return value
    .replace(/([a-zà-ÿ])([A-ZÀ-Ÿ])/g, '$1 $2')
    .replace(/([A-ZÀ-Ÿ]{2,})([A-ZÀ-Ÿ][a-zà-ÿ])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "1Aarde" → "1 Aarde" */
export function normalizeGrade(grade: string): string {
  return String(grade || '')
    .replace(/(\d)([A-Za-zÀ-ÿ])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

export function looksLikeClassToken(s: string): boolean {
  const t = String(s || '').trim();
  if (!t) return false;
  if (/^\d/.test(t)) return true;
  if (/^(klas|groep|jaar)\b/i.test(t)) return true;
  return false;
}

/**
 * "Degrendele;Leandro" (Achternaam;Voornaam) → "Leandro Degrendele"
 * Also handles leftover glued names without spaces.
 */
export function fixSemicolonName(raw: string): string {
  const value = String(raw || '').trim();
  if (!value) return '';

  if (value.includes(';')) {
    const bits = value.split(';').map((s) => s.trim()).filter(Boolean);
    if (bits.length >= 2 && !looksLikeClassToken(bits[1])) {
      // Smartschool / bulk: Achternaam;Voornaam
      return normalizePersonName(bits[1], bits[0]);
    }
    return normalizePersonName(...bits);
  }

  if (value.includes(',')) {
    const bits = value.split(',').map((s) => s.trim()).filter(Boolean);
    if (bits.length >= 2 && !looksLikeClassToken(bits[1])) {
      const [last, ...firstParts] = bits;
      return normalizePersonName(firstParts.join(' '), last);
    }
  }

  return normalizePersonName(value);
}

export function normalizePersonName(...parts: Array<string | undefined | null>): string {
  const cleaned = parts
    .map((p) => (p == null ? '' : String(p).replace(/\s+/g, ' ').trim()))
    .filter(Boolean);

  // If a single part still has ";", expand it
  if (cleaned.length === 1 && /[;,]/.test(cleaned[0])) {
    return fixSemicolonName(cleaned[0]);
  }

  return unglueCamelCase(cleaned.join(' '));
}

/** Tokens of a display name (stable key for matching across days). */
export function nameTokenKey(name: string): string {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.toLowerCase())
    .sort((a, b) => a.localeCompare(b, 'nl'))
    .join('|');
}

/**
 * Align name order across days using a reference day (default MAANDAG).
 * Fixes "Degrendele Leandro" when MAANDAG already has "Leandro Degrendele".
 */
export function alignNamesToReferenceDay<
  T extends { name: string; grade?: string; day?: string },
>(students: T[], referenceDay = 'MAANDAG'): T[] {
  const refs = students.filter((s) => String(s.day || '').toUpperCase() === referenceDay);
  const canonical = new Map<string, string>();

  for (const r of refs) {
    const key = `${nameTokenKey(r.name)}::${normalizeGrade(r.grade || '').toLowerCase()}`;
    if (key.startsWith('::')) continue;
    if (!canonical.has(key)) canonical.set(key, r.name);
  }

  if (canonical.size === 0) return students;

  return students.map((s) => {
    const key = `${nameTokenKey(s.name)}::${normalizeGrade(s.grade || '').toLowerCase()}`;
    const wanted = canonical.get(key);
    if (wanted && wanted !== s.name) {
      return { ...s, name: wanted };
    }
    return s;
  });
}

/**
 * Flip two-token "Achternaam Voornaam" → "Voornaam Achternaam".
 * Use only when the list is known to be Last First (e.g. paste without semicolon).
 */
export function flipTwoTokenName(name: string): string {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 2) {
    return normalizePersonName(parts[1], parts[0]);
  }
  return normalizePersonName(name);
}

/**
 * Build display name from Excel/Smartschool rows.
 * Smartschool: "Voornaam" + "Naam" (surname). "Naam" alone is NOT always full name.
 */
export function buildStudentName(row: Record<string, unknown>): string {
  const voornaam = cellExact(row, ['Voornaam', 'First name', 'Firstname', 'First Name']);
  const achternaam = cellExact(row, [
    'Achternaam',
    'Last name',
    'Lastname',
    'Familienaam',
    'Last Name',
  ]);
  const naamAsSurnameOrFull = cellExact(row, ['Naam', 'Name']);
  const full = cellExact(row, [
    'Volledige naam',
    'Volledige Naam',
    'Full name',
    'Full Name',
    'Leerling',
    'Student',
  ]);

  if (voornaam && (achternaam || naamAsSurnameOrFull)) {
    return normalizePersonName(voornaam, achternaam || naamAsSurnameOrFull);
  }
  if (full) return fixSemicolonName(full);
  if (voornaam && achternaam) return normalizePersonName(voornaam, achternaam);
  if (naamAsSurnameOrFull) return fixSemicolonName(naamAsSurnameOrFull);
  if (voornaam) return normalizePersonName(voornaam);
  if (achternaam) return normalizePersonName(achternaam);
  return '';
}

export function buildStudentGrade(row: Record<string, unknown>): string {
  return normalizeGrade(
    cellExact(row, ['Klas', 'Grade', 'Groep', 'Jaar', 'Class', 'Klasnaam', 'Klas naam'])
  );
}

/**
 * Parse pasted bulk lines.
 * Supports:
 * - Achternaam;Voornaam;Klas
 * - Voornaam Achternaam;Klas
 * - Naam\tKlas
 * - Achternaam;Voornaam  (zonder klas)
 */
export function parseBulkStudentLines(text: string): { name: string; grade: string }[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      let name = '';
      let grade = '';

      if (/[;\t]/.test(line)) {
        const parts = line.split(/[;\t]/).map((p) => p.trim()).filter(Boolean);

        if (parts.length >= 3) {
          // Achternaam;Voornaam;Klas  OR  Voornaam;Achternaam;Klas
          // If third looks like class → first two are name parts (Last;First)
          if (looksLikeClassToken(parts[2]) || parts.length > 3) {
            name = normalizePersonName(parts[1], parts[0]);
            grade = parts.slice(2).join(' ');
          } else {
            name = normalizePersonName(parts[1], parts[0]);
            grade = parts.slice(2).join(' ');
          }
        } else if (parts.length === 2) {
          if (looksLikeClassToken(parts[1])) {
            // "Voornaam Achternaam;Klas" of "Achternaam;Voornaam" al gefixt in parts[0]
            name = fixSemicolonName(parts[0]);
            grade = parts[1];
          } else {
            // Achternaam;Voornaam
            name = normalizePersonName(parts[1], parts[0]);
            grade = '';
          }
        } else {
          name = fixSemicolonName(parts[0] || line);
        }
      } else if (/\s-\s/.test(line)) {
        const parts = line.split(/\s-\s/).map((p) => p.trim()).filter(Boolean);
        name = fixSemicolonName(parts[0] || '');
        grade = parts.slice(1).join(' - ');
      } else {
        const classAtEnd = line.match(/^(.*?)[,\s]+(\d+\s*[A-Za-zÀ-ÿ].*)$/);
        if (classAtEnd) {
          name = fixSemicolonName(classAtEnd[1]);
          grade = classAtEnd[2];
        } else {
          name = fixSemicolonName(line);
        }
      }

      return { name: name.trim(), grade: normalizeGrade(grade) };
    })
    .filter((r) => r.name);
}
