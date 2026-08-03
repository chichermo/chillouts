import { createClient } from '@supabase/supabase-js';

const url = 'https://etwyxdbkagbihadvfesq.supabase.co';
const key =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0d3l4ZGJrYWdiaWhhZHZmZXNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzU3MTAsImV4cCI6MjA4MDYxMTcxMH0.j3v4vGGxAkTsoY9gWFTONm0Rcnh7ojBT9s3papi0-iM';

const supabase = createClient(url, key);
const SID = 'imported_63_72507';

const { data: records } = await supabase.from('daily_records').select('date,entries');

let allKeys = new Set();
let totalKeys = 0;
let days = 0;

for (const row of records || []) {
  const ent = row.entries?.[SID];
  if (!ent) continue;
  const keys = Object.keys(ent);
  if (keys.length === 0) continue;
  days++;
  for (const k of keys) {
    allKeys.add(k);
    const slot = ent[k];
    let n = 0;
    if (Array.isArray(slot)) n = slot.length;
    else if (slot?.count) n = Number(slot.count) || 0;
    totalKeys += n;
  }
  if (row.date === '2026-01-27') {
    console.log('2026-01-27 raw keys:', JSON.stringify(ent, null, 2));
  }
}

console.log('Days:', days, 'Sum slot lengths (naive):', totalKeys);
console.log('All keys seen:', [...allKeys].sort().join(', '));
