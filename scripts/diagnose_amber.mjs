/**
 * Diagnose Amber chill-out dates and duplicate patterns in Supabase.
 */
import { createClient } from '@supabase/supabase-js';

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://etwyxdbkagbihadvfesq.supabase.co';
const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0d3l4ZGJrYWdiaWhhZHZmZXNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzU3MTAsImV4cCI6MjA4MDYxMTcxMH0.j3v4vGGxAkTsoY9gWFTONm0Rcnh7ojBT9s3papi0-iM';

const supabase = createClient(url, key);
const DAYS = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];

function getDayName(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  return DAYS[d.getDay()];
}

function countEntries(entries) {
  let total = 0,
    vr = 0,
    vl = 0,
    g = 0;
  if (!entries) return { total, vr, vl, g };
  for (let h = 1; h <= 7; h++) {
    const slot = entries[h] ?? entries[String(h)];
    if (!slot) continue;
    const arr = Array.isArray(slot) ? slot : [];
    if (!Array.isArray(slot) && slot?.count) {
      const n = Math.min(3, Number(slot.count) || 0);
      total += n;
      if (slot.type === 'VR') vr += n;
      else if (slot.type === 'VL') vl += n;
      else g += n;
      continue;
    }
    for (const e of arr) {
      if (!e || typeof e !== 'object') continue;
      if ('count' in e && (Number(e.count) <= 0 || !Number.isFinite(Number(e.count))))
        continue;
      if (!('type' in e) && !('count' in e)) continue;
      total++;
      if (e.type === 'VR') vr++;
      else if (e.type === 'VL') vl++;
      else g++;
    }
  }
  return { total, vr, vl, g };
}

const { data: students } = await supabase
  .from('students')
  .select('id,name,klas')
  .ilike('name', '%amber%');

console.log('Students:', students);

const amber = (students || []).find((s) =>
  s.klas.toUpperCase().includes('MGB')
);
if (!amber) {
  console.log('No Amber MGB');
  process.exit(0);
}

const { data: records } = await supabase.from('daily_records').select('date,entries');

const byDate = [];
let total = 0,
  diTotal = 0;
const byMd = new Map();

for (const row of records || []) {
  const ent = row.entries?.[amber.id];
  if (!ent) continue;
  const c = countEntries(ent);
  if (c.total === 0) continue;
  const day = getDayName(row.date);
  byDate.push({ date: row.date, day, ...c });
  total += c.total;
  if (day === 'Di') diTotal += c.total;
  const md = row.date.slice(5);
  if (!byMd.has(md)) byMd.set(md, []);
  byMd.get(md).push(row.date);
}

byDate.sort((a, b) => a.date.localeCompare(b.date));
console.log('\nAmber', amber.id, amber.klas);
console.log('Days with data:', byDate.length);
console.log('Total:', total, '| Tuesday only:', diTotal);

const dupMd = [...byMd.entries()].filter(([, dates]) => dates.length > 1);
if (dupMd.length) {
  console.log('\nDuplicate month-day across years:');
  for (const [md, dates] of dupMd) {
    console.log(' ', md, dates.join(', '));
  }
}

console.log('\nPer day:');
for (const d of byDate) {
  console.log(` ${d.date} ${d.day} tot=${d.total}`);
}
