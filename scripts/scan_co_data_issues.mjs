/**
 * Escanea daily_records en Supabase: legacy count>1, posible pérdida por dedupe, etc.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://etwyxdbkagbihadvfesq.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
if (!key) {
  console.error('Zet NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

function canonicalCount(ent) {
  let t = 0;
  for (let h = 1; h <= 7; h++) {
    const slot = ent[h] ?? ent[String(h)];
    if (!slot) continue;
    if (Array.isArray(slot)) {
      for (const e of slot) {
        if (!e || typeof e !== 'object') continue;
        if ('count' in e && (Number(e.count) <= 0 || !Number.isFinite(Number(e.count)))) continue;
        if (!('type' in e) && !('count' in e)) continue;
        t++;
      }
    } else if (slot?.count) {
      t += Math.min(3, Number(slot.count) || 0);
    }
  }
  return t;
}

function legacyCount(ent) {
  let t = 0;
  for (let h = 1; h <= 7; h++) {
    const slot = ent[h] ?? ent[String(h)];
    if (!slot) continue;
    if (Array.isArray(slot)) {
      for (const e of slot) {
        if (!e || typeof e !== 'object') continue;
        const n = 'count' in e ? Number(e.count) : 1;
        t += Math.min(3, Math.max(0, Number.isFinite(n) ? n || 1 : 1));
      }
    } else if (slot?.count) {
      t += Math.min(3, Number(slot.count) || 0);
    }
  }
  return t;
}

function findIssues(ent) {
  const issues = [];
  for (let h = 1; h <= 7; h++) {
    const a = ent[h];
    const b = ent[String(h)];
    if (a !== undefined && b !== undefined && a !== b) {
      issues.push({ type: 'duplicate_hour_keys', hour: h });
    }
    const slot = a ?? b;
    if (!slot) continue;
    if (Array.isArray(slot)) {
      for (let i = 0; i < slot.length; i++) {
        const e = slot[i];
        if (e && typeof e === 'object' && 'count' in e && Number(e.count) > 1) {
          issues.push({
            type: 'legacy_count_on_array',
            hour: h,
            index: i,
            count: Number(e.count),
            typeVal: e.type,
          });
        }
      }
      const generics = slot.filter(
        (e) =>
          e &&
          typeof e === 'object' &&
          (e.type === null || e.type === undefined || e.type === '') &&
          (!('count' in e) || Number(e.count) === 1)
      );
      if (generics.length === 1 && slot.length === 1) {
        // no se puede saber si hubo más; solo flag para revisión manual
      }
    }
  }
  return issues;
}

const { data: students } = await supabase.from('students').select('id,name,klas');
const studentMap = new Map((students || []).map((s) => [s.id, s]));

const { data: rows, error } = await supabase.from('daily_records').select('date,entries').order('date');
if (error) throw error;

const legacyInflated = [];
const duplicateKeys = [];
const legacyArrayCount = [];
let totalCanonical = 0;
let totalLegacy = 0;

for (const row of rows || []) {
  for (const [sid, ent] of Object.entries(row.entries || {})) {
    if (!ent) continue;
    const c = canonicalCount(ent);
    const l = legacyCount(ent);
    totalCanonical += c;
    totalLegacy += l;
    if (l > c) {
      const st = studentMap.get(sid);
      legacyInflated.push({
        date: row.date,
        studentId: sid,
        name: st?.name || sid,
        klas: st?.klas || '?',
        canonical: c,
        legacy: l,
        diff: l - c,
      });
    }
    const issues = findIssues(ent);
    for (const iss of issues) {
      if (iss.type === 'duplicate_hour_keys') {
        duplicateKeys.push({ date: row.date, studentId: sid, name: studentMap.get(sid)?.name, ...iss });
      }
      if (iss.type === 'legacy_count_on_array') {
        legacyArrayCount.push({
          date: row.date,
          studentId: sid,
          name: studentMap.get(sid)?.name,
          klas: studentMap.get(sid)?.klas,
          ...iss,
        });
      }
    }
  }
}

console.log('=== RESUMEN ===');
console.log('Días en BD:', rows?.length);
console.log('Chill-outs canónicos totales:', totalCanonical);
console.log('Chill-outs legacy (count>1 en array):', totalLegacy);
console.log('Diferencia legacy-canonical:', totalLegacy - totalCanonical);
console.log('');
console.log('Casos legacy>canonical (recuperables si count>1 sigue en JSON):', legacyInflated.length);
console.log('Casos duplicate hour keys:', duplicateKeys.length);
console.log('Casos count>1 en elemento array:', legacyArrayCount.length);

if (legacyInflated.length) {
  console.log('\n=== DÍAS/ALUMNOS CON count>1 EN JSON (recuperable) ===');
  for (const x of legacyInflated.slice(0, 50)) {
    console.log(`${x.date} | ${x.name} (${x.klas}) | canon=${x.canonical} legacy=${x.legacy}`);
  }
  if (legacyInflated.length > 50) console.log(`... y ${legacyInflated.length - 50} más`);
}

if (legacyArrayCount.length) {
  console.log('\n=== ELEMENTOS CON count>1 ===');
  for (const x of legacyArrayCount.slice(0, 30)) {
    console.log(`${x.date} | ${x.name} | L${x.hour} count=${x.count}`);
  }
}

const datesAffected = [...new Set(legacyInflated.map((x) => x.date))].sort();
console.log('\n=== FECHAS CON POSIBLE INFLACIÓN LEGACY EN JSON ===');
console.log(datesAffected.length ? datesAffected.join(', ') : '(ninguna)');
