/**
 * Maakt lege rooster-rijen aan voor alle klassen in Supabase.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://etwyxdbkagbihadvfesq.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!key) {
  console.error('Zet NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);
const YEAR = process.argv[2] || '2025-2026';

function timetableId(year, klas) {
  return `timetable_${year}_${klas.replace(/\s+/g, '_')}`;
}

const { data: students } = await supabase.from('students').select('klas');
const klassen = [...new Set((students || []).map((s) => s.klas).filter(Boolean))].sort();

const { data: existing } = await supabase.from('timetables').select('klas').eq('year', YEAR);
const have = new Set((existing || []).map((r) => r.klas));

let created = 0;
for (const klas of klassen) {
  if (have.has(klas)) continue;
  const { error } = await supabase.from('timetables').upsert(
    {
      id: timetableId(YEAR, klas),
      year: YEAR,
      klas,
      slots: {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'year,klas' }
  );
  if (error) throw error;
  created++;
  console.log('+', klas);
}

console.log(`Klaar: ${created} roosters aangemaakt voor ${YEAR}, ${klassen.length - created} bestonden al.`);
