/**
 * Portalrechten:
 * - Iedereen: portal_chillouts=true (bestaande Chill-outs toegang behouden)
 * - Admin (hardcoded) + annelore: alle drie portalen
 *
 *   node scripts/fix_portal_permissions.mjs
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const dryRun = process.argv.includes('--dry-run');

const ALL_PORTALS = new Set(['annelore.delbecque']);

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
  const full = ALL_PORTALS.has(user.username);
  const permissions = {
    ...(user.permissions || {}),
    portal_chillouts: true,
    portal_detentions: full,
    portal_o2: full,
  };

  const changed =
    user.permissions?.portal_chillouts !== true ||
    user.permissions?.portal_detentions !== full ||
    user.permissions?.portal_o2 !== full;

  if (!changed) {
    console.log('OK', user.username, full ? 'ALL portals' : 'chillouts only');
    continue;
  }

  console.log(
    'UPDATE',
    user.username,
    `chillouts=true detentions=${full} o2=${full}`
  );

  if (!dryRun) {
    const { error: upErr } = await supabase
      .from('users')
      .update({ permissions, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (upErr) {
      console.error(user.username, upErr);
      process.exit(1);
    }
  }
  updated++;
}

console.log(`\nKlaar: ${updated} ${dryRun ? '(dry-run)' : 'bijgewerkt'}.`);
