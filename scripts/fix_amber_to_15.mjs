/**
 * Corrigeert Amber: generics alleen op dinsdag, max 1 VR + 1 VL.
 * Verwacht eindtotaal: 15 (13 Di + 1 VR + 1 VL).
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Zet NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);
const SID = 'imported_63_72507';
const DAYS = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];

function normalizeType(raw) {
  if (raw == null) return null;
  const t = String(raw).trim().toUpperCase();
  if (t === 'VR') return 'VR';
  if (t === 'VL') return 'VL';
  return null;
}

function slotToArray(slot) {
  if (!slot) return [];
  if (Array.isArray(slot)) {
    return slot
      .filter((e) => e && typeof e === 'object' && ('type' in e || 'count' in e))
      .map((e) => ({ count: 1, type: normalizeType(e.type) }));
  }
  if (slot?.count) {
    const n = Math.min(3, Math.max(0, Number(slot.count) || 0));
    const type = normalizeType(slot.type);
    return Array.from({ length: n }, () => ({ count: 1, type }));
  }
  return [];
}

function countEntries(ent) {
  let total = 0,
    vr = 0,
    vl = 0,
    g = 0;
  for (let h = 1; h <= 7; h++) {
    for (const e of slotToArray(ent[h] ?? ent[String(h)])) {
      total++;
      if (e.type === 'VR') vr++;
      else if (e.type === 'VL') vl++;
      else g++;
    }
  }
  return { total, vr, vl, g };
}

function pruneDay(ent, weekday, caps) {
  const out = {};
  for (let h = 1; h <= 7; h++) {
    const arr = slotToArray(ent[h] ?? ent[String(h)]);
    const kept = [];
    for (const e of arr) {
      if (weekday === 'Di') {
        kept.push(e);
        continue;
      }
      if (e.type === 'VR' && caps.vr > 0) {
        kept.push(e);
        caps.vr--;
      } else if (e.type === 'VL' && caps.vl > 0) {
        kept.push(e);
        caps.vl--;
      }
    }
    if (kept.length) out[h] = kept.slice(0, 3);
  }
  return out;
}

const { data: students } = await supabase
  .from('students')
  .select('id,name,klas')
  .ilike('name', '%amber%');
const amber = (students || []).find((s) => s.klas.toUpperCase().includes('MGB'));
if (!amber) {
  console.error('Geen Amber MGB');
  process.exit(1);
}

const { data: rows, error } = await supabase.from('daily_records').select('date,day_name,entries');
if (error) throw error;

let before = { total: 0, vr: 0, vl: 0, g: 0 };
let after = { total: 0, vr: 0, vl: 0, g: 0 };
let updated = 0;
const caps = { vr: 1, vl: 1 };
const toUpsert = [];

for (const row of (rows || []).sort((a, b) => a.date.localeCompare(b.date))) {
  const ent = row.entries?.[amber.id];
  if (!ent) continue;
  const b = countEntries(ent);
  before.total += b.total;
  before.vr += b.vr;
  before.vl += b.vl;
  before.g += b.g;

  const d = new Date(`${row.date}T12:00:00`);
  const weekday = DAYS[d.getDay()];
  const pruned = pruneDay(ent, weekday, caps);
  const a = countEntries(pruned);
  after.total += a.total;
  after.vr += a.vr;
  after.vl += a.vl;
  after.g += a.g;

  const entries = { ...row.entries };
  if (Object.keys(pruned).length === 0) {
    delete entries[amber.id];
  } else {
    entries[amber.id] = pruned;
  }

  if (JSON.stringify(ent) !== JSON.stringify(entries[amber.id] ?? {})) {
    updated++;
    toUpsert.push({ date: row.date, day_name: row.day_name, entries });
  }
}

console.log('Amber', amber.name, amber.id);
console.log('Voor:', before);
console.log('Na:', after);
console.log('Dagen bijgewerkt:', updated);

if (updated === 0) {
  console.log('Geen wijzigingen nodig.');
  process.exit(0);
}

for (const rec of toUpsert) {
  const { error: upErr } = await supabase
    .from('daily_records')
    .upsert(rec, { onConflict: 'date' });
  if (upErr) throw upErr;
}

console.log('Opgeslagen in Supabase.');
