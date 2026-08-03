/**
 * Solo lectura: compara métodos de conteo para un alumno.
 * Uso (desde la raíz del proyecto):
 *   set NEXT_PUBLIC_SUPABASE_URL=...
 *   set NEXT_PUBLIC_SUPABASE_ANON_KEY=...
 *   node scripts/audit_chillout_counts.mjs "Amber" "3GB"
 */

import { createClient } from '@supabase/supabase-js';

const studentName = (process.argv[2] || 'Amber').toLowerCase();
const studentKlas = process.argv[3] || '3GB';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

/** Rapporten ANTES de b0b97d8: solo arrays */
function countOldRapporten(slot) {
  if (!slot) return { total: 0, vr: 0, vl: 0, generic: 0 };
  const arr = Array.isArray(slot) ? slot : [];
  let total = 0,
    vr = 0,
    vl = 0,
    generic = 0;
  for (const entry of arr) {
    if (!entry) continue;
    total++;
    if (entry.type === 'VR') vr++;
    else if (entry.type === 'VL') vl++;
    else generic++;
  }
  return { total, vr, vl, generic };
}

/** Rapporten AHORA: forEachChillOutAtHour */
function countNewRapporten(slot) {
  let total = 0,
    vr = 0,
    vl = 0,
    generic = 0;
  const add = (type) => {
    total++;
    if (type === 'VR') vr++;
    else if (type === 'VL') vl++;
    else generic++;
  };
  if (!slot) return { total, vr, vl, generic };
  if (Array.isArray(slot)) {
    for (const entry of slot) {
      if (!entry) continue;
      add(entry.type ?? null);
    }
    return { total, vr, vl, generic };
  }
  if (typeof slot === 'object' && slot !== null && 'count' in slot) {
    const n = Math.min(3, Math.max(0, Number(slot.count) || 0));
    for (let i = 0; i < n; i++) add(slot.type ?? null);
  }
  return { total, vr, vl, generic };
}

/** Dagelijks / calculateDailyTotals */
function countDagelijks(slot) {
  if (!slot) return { total: 0, vr: 0, vl: 0, generic: 0 };
  if (Array.isArray(slot)) {
    let total = 0,
      vr = 0,
      vl = 0,
      generic = 0;
    for (const entry of slot) {
      if (!entry) continue;
      total++;
      if (entry.type === 'VR') vr++;
      else if (entry.type === 'VL') vl++;
      else generic++;
    }
    return { total, vr, vl, generic };
  }
  if (typeof slot === 'object' && slot !== null && 'count' in slot) {
    const c = Number(slot.count) || 0;
    if (c <= 0) return { total: 0, vr: 0, vl: 0, generic: 0 };
    const t = slot.type;
    return {
      total: c,
      vr: t === 'VR' ? c : 0,
      vl: t === 'VL' ? c : 0,
      generic: t === 'VR' || t === 'VL' ? 0 : c,
    };
  }
  return { total: 0, vr: 0, vl: 0, generic: 0 };
}

function slotFormat(slot) {
  if (!slot) return 'empty';
  if (Array.isArray(slot)) return `array[${slot.length}]`;
  if (typeof slot === 'object' && 'count' in slot) return `legacy{count:${slot.count},type:${slot.type}}`;
  return 'unknown';
}

const { data: students, error: se } = await supabase
  .from('students')
  .select('id,name,klas,status')
  .ilike('name', `%${studentName}%`);

if (se) throw se;

const matches = (students || []).filter(
  (s) =>
    s.name.toLowerCase().includes(studentName) &&
    s.klas.toUpperCase().includes(studentKlas.toUpperCase())
);

if (matches.length === 0) {
  console.log('No se encontró alumno:', studentName, studentKlas);
  console.log(
    'Coincidencias por nombre:',
    (students || []).map((s) => `${s.name} (${s.klas})`).join(', ')
  );
  process.exit(0);
}

console.log('Alumno(s) encontrado(s):');
for (const s of matches) {
  console.log(`  - ${s.name} | ${s.klas} | ${s.id} | ${s.status}`);
}

const { data: records, error: re } = await supabase.from('daily_records').select('date,entries');
if (re) throw re;

for (const student of matches) {
  console.log('\n===', student.name, student.klas, '===\n');

  const sums = {
    old: { total: 0, vr: 0, vl: 0, generic: 0 },
    new: { total: 0, vr: 0, vl: 0, generic: 0 },
    dag: { total: 0, vr: 0, vl: 0, generic: 0 },
  };
  const diffs = [];

  for (const row of records || []) {
    const entries = row.entries?.[student.id];
    if (!entries) continue;

    let dayOld = { total: 0, vr: 0, vl: 0, generic: 0 };
    let dayNew = { total: 0, vr: 0, vl: 0, generic: 0 };
    let dayDag = { total: 0, vr: 0, vl: 0, generic: 0 };
    const formats = [];

    for (let hour = 1; hour <= 7; hour++) {
      const slot = entries[hour] ?? entries[String(hour)];
      if (!slot) continue;
      formats.push(`L${hour}:${slotFormat(slot)}`);
      const o = countOldRapporten(slot);
      const n = countNewRapporten(slot);
      const d = countDagelijks(slot);
      dayOld.total += o.total;
      dayNew.total += n.total;
      dayDag.total += d.total;
      dayOld.vr += o.vr;
      dayNew.vr += n.vr;
      dayDag.vr += d.vr;
      dayOld.vl += o.vl;
      dayNew.vl += n.vl;
      dayDag.vl += d.vl;
      dayOld.generic += o.generic;
      dayNew.generic += n.generic;
      dayDag.generic += d.generic;
    }

    if (dayNew.total === 0) continue;

    sums.old.total += dayOld.total;
    sums.new.total += dayNew.total;
    sums.dag.total += dayDag.total;
    sums.old.vr += dayOld.vr;
    sums.new.vr += dayNew.vr;
    sums.dag.vr += dayDag.vr;
    sums.old.vl += dayOld.vl;
    sums.new.vl += dayNew.vl;
    sums.dag.vl += dayDag.vl;
    sums.old.generic += dayOld.generic;
    sums.new.generic += dayNew.generic;
    sums.dag.generic += dayDag.generic;

    if (dayOld.total !== dayNew.total || dayNew.total !== dayDag.total) {
      diffs.push({
        date: row.date,
        old: dayOld.total,
        new: dayNew.total,
        dag: dayDag.total,
        formats: formats.join(' '),
      });
    }
  }

  console.log('TOTALES acumulados:');
  console.log('  Rapporten (código viejo, solo arrays):', sums.old);
  console.log('  Rapporten (código actual):              ', sums.new);
  console.log('  Dagelijks / utils (referencia):         ', sums.dag);
  console.log('\n  Totaal = VR + VL + Chillouts(genéricos)');

  if (diffs.length) {
    console.log(`\nDías con diferencia de conteo (${diffs.length}):`);
    for (const d of diffs) {
      console.log(
        `  ${d.date} | viejo=${d.old} nuevo=${d.new} dagelijks=${d.dag} | ${d.formats}`
      );
    }
  } else {
    console.log('\nTodos los días coinciden entre método nuevo y Dagelijks.');
    if (sums.old.total !== sums.new.total) {
      console.log(
        `  → La diferencia con "antes" es solo Rapporten viejo: ${sums.old.total} vs ${sums.new.total} (+${sums.new.total - sums.old.total} por formato legacy)`
      );
    }
  }
}
