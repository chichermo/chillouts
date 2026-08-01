/**
 * Portalrechten:
 * - Iedereen: portal_chillouts=true, portal_detentions=true
 * - Admin (hardcoded) + annelore: ook portal_o2
 *
 *   node scripts/fix_portal_permissions.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function loadEnvLocal() {
  for (const name of ['.env.local', '.env.vercel.pull', '.env']) {
    const p = resolve(process.cwd(), name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  }
}

loadEnvLocal();

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
  const o2 = ALL_PORTALS.has(user.username) || user.permissions?.portal_o2 === true;
  const permissions = {
    ...(user.permissions || {}),
    portal_chillouts: true,
    portal_detentions: true,
    portal_o2: !!o2,
  };

  const changed =
    user.permissions?.portal_chillouts !== true ||
    user.permissions?.portal_detentions !== true ||
    user.permissions?.portal_o2 !== permissions.portal_o2;

  if (!changed) {
    console.log('OK', user.username, permissions.portal_o2 ? 'chillouts+nablijven+o2' : 'chillouts+nablijven');
    continue;
  }

  console.log(
    'UPDATE',
    user.username,
    `chillouts=true detentions=true o2=${!!permissions.portal_o2}`
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
