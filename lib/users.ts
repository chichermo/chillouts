import { supabase, isSupabaseEnabled } from './supabase';

export interface User {
  id: string;
  username: string;
  password_hash: string;
  role: 'admin' | 'full_access' | 'dagelijks_access' | 'reports_access';
  permissions: {
    dagelijks?: boolean;
    weekoverzicht?: boolean;
    statistieken?: boolean;
    rapporten?: boolean;
    rapporten_docenten?: boolean;
    backup?: boolean;
    students?: boolean;
    audit?: boolean;
  };
  created_at?: string;
  updated_at?: string;
  last_login?: string;
  active: boolean;
  profile_picture?: string;
  email?: string;
  phone?: string;
  reset_token?: string;
  reset_token_expires?: string;
}

export interface UserPermissions {
  dagelijks: boolean;
  weekoverzicht: boolean;
  statistieken: boolean;
  rapporten: boolean;
  rapporten_docenten: boolean;
  backup: boolean;
  students: boolean;
  audit: boolean;
}

export const ROLE_PERMISSIONS: Record<string, UserPermissions> = {
  admin: {
    dagelijks: true,
    weekoverzicht: true,
    statistieken: true,
    rapporten: true,
    rapporten_docenten: true,
    backup: true,
    students: true,
    audit: true,
  },
  full_access: {
    dagelijks: true,
    weekoverzicht: true,
    statistieken: true,
    rapporten: true,
    rapporten_docenten: false,
    backup: false,
    students: true,
    audit: false,
  },
  dagelijks_access: {
    dagelijks: true,
    weekoverzicht: true,
    statistieken: true,
    rapporten: true,
    rapporten_docenten: false,
    backup: false,
    students: false,
    audit: false,
  },
  reports_access: {
    dagelijks: false,
    weekoverzicht: true,
    statistieken: true,
    rapporten: true,
    rapporten_docenten: false,
    backup: false,
    students: false,
    audit: false,
  },
};

function requireSupabase() {
  if (!isSupabaseEnabled || !supabase) {
    throw new Error(
      'Supabase is niet geconfigureerd. Zet NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY in.'
    );
  }
  return supabase;
}

function assertRowsAffected(
  data: unknown[] | null,
  error: { message: string } | null,
  action: string
): void {
  if (error) throw new Error(error.message);
  if (!data?.length) {
    throw new Error(
      `${action} mislukt: geen rijen gewijzigd in Supabase. Controleer rechten (RLS) of gebruiker-ID.`
    );
  }
}

async function hashPassword(password: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return btoa(password);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (hash.length === 64 && /^[0-9a-f]+$/i.test(hash)) {
    const passwordHash = await hashPassword(password);
    return passwordHash === hash;
  }
  return atob(hash) === password;
}

export async function createUser(
  username: string,
  password: string,
  role: User['role']
): Promise<User> {
  const client = requireSupabase();
  const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const passwordHash = await hashPassword(password);
  const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.reports_access;

  const { data, error } = await client
    .from('users')
    .insert({
      id: userId,
      username,
      password_hash: passwordHash,
      role,
      permissions,
      active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('active', true)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }
  return data || null;
}

export async function getAllUsers(options?: { includeInactive?: boolean }): Promise<User[]> {
  const client = requireSupabase();
  let query = client.from('users').select('*').order('username', { ascending: true });

  if (!options?.includeInactive) {
    query = query.eq('active', true);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function updateUser(
  userId: string,
  updates: Partial<Omit<User, 'id' | 'password_hash'>> & { password?: string }
): Promise<void> {
  const client = requireSupabase();
  const updateData: Record<string, unknown> = {};

  if (updates.username !== undefined) updateData.username = updates.username;
  if (updates.role !== undefined) updateData.role = updates.role;
  if (updates.active !== undefined) updateData.active = updates.active;
  if (updates.email !== undefined) updateData.email = updates.email;
  if (updates.phone !== undefined) updateData.phone = updates.phone;
  if (updates.profile_picture !== undefined) updateData.profile_picture = updates.profile_picture;

  if (updates.password && updates.password.trim() !== '') {
    updateData.password_hash = await hashPassword(updates.password);
  }

  if (updates.role && !updates.permissions) {
    updateData.permissions = ROLE_PERMISSIONS[updates.role] || ROLE_PERMISSIONS.reports_access;
  }
  if (updates.permissions) {
    updateData.permissions = updates.permissions;
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error('Geen wijzigingen om op te slaan.');
  }

  updateData.updated_at = new Date().toISOString();

  const { data, error } = await client
    .from('users')
    .update(updateData)
    .eq('id', userId)
    .select('id');

  assertRowsAffected(data, error, 'Bijwerken');
}

export async function deleteUser(userId: string): Promise<void> {
  if (!userId || userId === 'admin_temp') {
    throw new Error('Deze gebruiker kan niet worden verwijderd.');
  }

  const client = requireSupabase();
  const { data, error } = await client.from('users').delete().eq('id', userId).select('id');

  assertRowsAffected(data, error, 'Verwijderen');
}

export async function authenticateUser(username: string, password: string): Promise<User | null> {
  const user = await getUserByUsername(username);
  if (!user) return null;

  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) return null;

  const client = requireSupabase();
  await client
    .from('users')
    .update({ last_login: new Date().toISOString() })
    .eq('id', user.id);

  return user;
}

export async function generateResetToken(username: string): Promise<string | null> {
  const user = await getUserByUsername(username);
  if (!user) return null;

  const token =
    Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const expires = new Date();
  expires.setHours(expires.getHours() + 1);

  const client = requireSupabase();
  const { error } = await client
    .from('users')
    .update({
      reset_token: token,
      reset_token_expires: expires.toISOString(),
    })
    .eq('id', user.id);

  if (error) return null;
  return token;
}

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<boolean> {
  const client = requireSupabase();
  const { data: users, error: findError } = await client
    .from('users')
    .select('*')
    .eq('reset_token', token)
    .gt('reset_token_expires', new Date().toISOString());

  if (findError || !users?.length) return false;

  const user = users[0];
  const passwordHash = await hashPassword(newPassword);

  const { error: updateError } = await client
    .from('users')
    .update({
      password_hash: passwordHash,
      reset_token: null,
      reset_token_expires: null,
    })
    .eq('id', user.id);

  return !updateError;
}

export function hasPermission(user: User | null, permission: keyof UserPermissions): boolean {
  if (!user || !user.active) return false;
  if (user.role === 'admin') return true;
  if (!user.permissions) return false;
  return user.permissions[permission] === true;
}
