/**
 * Rapporten: iedereen actief mag de pagina zien.
 * Rapporten per docent + Backup: alleen Admin (app) + annelore.delbecque.
 *
 *   node scripts/fix_rapporten_permissions.mjs
 *   node scripts/fix_rapporten_permissions.mjs --dry-run
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const dryRun = process.argv.includes('--dry-run');

const PRIVILEGED_USERS = new Set(['annelore.delbecque']);

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
  const wantTeacherStats = PRIVILEGED_USERS.has(user.username);
  const wantBackup = PRIVILEGED_USERS.has(user.username);
  const permissions = {
    ...(user.permissions || {}),
    rapporten: wantRapporten,
    rapporten_docenten: wantTeacherStats,
    backup: wantBackup,
  };

  const changed =
    user.permissions?.rapporten !== wantRapporten ||
    user.permissions?.rapporten_docenten !== wantTeacherStats ||
    user.permissions?.backup !== wantBackup;

  if (!changed) {
    console.log('OK', user.username, wantBackup ? '+docenten+backup' : '');
    continue;
  }

  console.log(
    'UPDATE',
    user.username,
    'rapporten=true',
    `rapporten_docenten=${wantTeacherStats}`,
    `backup=${wantBackup}`
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
