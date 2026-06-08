/**
 * Zet rapporten=false voor alle gebruikers behalve opgegeven usernames.
 * Admin (hardcoded login) heeft altijd toegang via de app.
 *
 *   node scripts/fix_rapporten_permissions.mjs
 *   node scripts/fix_rapporten_permissions.mjs --dry-run
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const dryRun = process.argv.includes('--dry-run');

/** Gebruikers die Rapporten mogen zien/exporteren (naast Admin-login). */
const KEEP_RAPPORTEN = new Set(['annelore.delbecque']);

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
  const shouldKeep = KEEP_RAPPORTEN.has(user.username);
  const current = user.permissions?.rapporten === true;
  if (current === shouldKeep) {
    console.log(shouldKeep ? 'OK keep' : 'OK off ', user.username);
    continue;
  }
  const permissions = { ...(user.permissions || {}), rapporten: shouldKeep };
  console.log(shouldKeep ? 'ENABLE' : 'DISABLE', user.username);
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
