/**
 * Rapporten: iedereen actief mag de pagina zien.
 * Rapporten per docent: alleen opgegeven gebruikers (+ Admin in de app).
 *
 *   node scripts/fix_rapporten_permissions.mjs
 *   node scripts/fix_rapporten_permissions.mjs --dry-run
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const dryRun = process.argv.includes('--dry-run');

const TEACHER_STATS_USERS = new Set([
  'annelore.delbecque',
  'julie.gérard',
  'liesbeth.kreps',
]);

if (!url || !key) {
  console.error('Zet NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);
const { data: users, error } = await supabase.from('users').select('id,username,permissions,active');
if (error) {
  console.error(error);
  process.exit(1);
}

let updated = 0;
for (const user of users || []) {
  if (!user.active) continue;

  const wantRapporten = true;
  const wantTeacherStats = TEACHER_STATS_USERS.has(user.username);
  const permissions = {
    ...(user.permissions || {}),
    rapporten: wantRapporten,
    rapporten_docenten: wantTeacherStats,
  };

  const changed =
    user.permissions?.rapporten !== wantRapporten ||
    user.permissions?.rapporten_docenten !== wantTeacherStats;

  if (!changed) {
    console.log('OK', user.username, wantTeacherStats ? '+docenten' : '');
    continue;
  }

  console.log(
    'UPDATE',
    user.username,
    'rapporten=true',
    wantTeacherStats ? 'rapporten_docenten=true' : 'rapporten_docenten=false'
  );

  if (!dryRun) {
    const { error: upErr } = await supabase
      .from('users')
      .update({ permissions, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (upErr) {
      console.error('Fout bij', user.username, upErr);
      process.exit(1);
    }
  }
  updated++;
}

console.log(`\nKlaar: ${updated} gebruikers ${dryRun ? '(dry-run)' : 'bijgewerkt'}.`);
