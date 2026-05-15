import { supabase, isSupabaseEnabled } from './supabase';
import { sortKlassen } from './utils';

const SETUP_HINT =
  'Voer supabase/app_settings_schema.sql uit in de Supabase SQL Editor.';

function requireSupabase() {
  if (!isSupabaseEnabled || !supabase) {
    throw new Error(
      'Supabase is niet geconfigureerd. Zet NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.'
    );
  }
  return supabase;
}

function isMissingTableError(error: {
  code?: string;
  message?: string;
  details?: string;
  status?: number;
} | null): boolean {
  if (!error) return false;
  const code = String(error.code || '');
  const msg = String(error.message || '').toLowerCase();
  const details = String(error.details || '').toLowerCase();
  const status = Number(error.status ?? 0);
  return (
    status === 404 ||
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.includes('does not exist') ||
    msg.includes('not found') ||
    details.includes('does not exist')
  );
}

export async function getAppSetting<T>(key: string): Promise<T | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) {
      throw new Error(`Tabel "app_settings" ontbreekt. ${SETUP_HINT}`);
    }
    throw error;
  }
  return (data?.value as T) ?? null;
}

export async function setAppSetting<T>(key: string, value: T): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from('app_settings').upsert(
    { key, value, updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  );

  if (error) {
    if (isMissingTableError(error)) {
      throw new Error(`Tabel "app_settings" ontbreekt. ${SETUP_HINT}`);
    }
    throw error;
  }
}

const KLASSEN_ORDER_KEY = 'klassen_order';

export function applyKlassenOrder(klassen: string[], customOrder: string[] | null): string[] {
  if (!customOrder?.length) return sortKlassen(klassen);
  const ordered = customOrder.filter((k) => klassen.includes(k));
  const newKlassen = klassen.filter((k) => !customOrder.includes(k));
  return [...ordered, ...sortKlassen(newKlassen)];
}

export async function loadKlassenOrder(klassen: string[]): Promise<string[]> {
  const stored = await getAppSetting<string[]>(KLASSEN_ORDER_KEY);
  return applyKlassenOrder(klassen, stored);
}

export async function saveKlassenOrder(klassen: string[]): Promise<void> {
  await setAppSetting(KLASSEN_ORDER_KEY, klassen);
}
