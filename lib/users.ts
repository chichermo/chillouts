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
  students: boolean;
  audit: boolean;
}

// Definir permisos por rol
export const ROLE_PERMISSIONS: Record<string, UserPermissions> = {
  admin: {
    dagelijks: true,
    weekoverzicht: true,
    statistieken: true,
    rapporten: true,
    students: true,
    audit: true,
  },
  full_access: {
    dagelijks: true,
    weekoverzicht: true,
    statistieken: true,
    rapporten: true,
    students: true,
    audit: false,
  },
  dagelijks_access: {
    dagelijks: true,
    weekoverzicht: true,
    statistieken: true,
    rapporten: true,
    students: false,
    audit: false,
  },
  reports_access: {
    dagelijks: false,
    weekoverzicht: true,
    statistieken: true,
    rapporten: true,
    students: false,
    audit: false,
  },
};

// Hash de contraseña simple (para desarrollo)
// NOTA: En producción, esto debería hacerse en una API route del servidor
async function hashPassword(password: string): Promise<string> {
  // Usar una función de hash simple basada en SHA-256
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Fallback simple (no seguro)
  return btoa(password);
}

// Verificar contraseña
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Si el hash parece ser SHA-256 (64 caracteres hex)
  if (hash.length === 64 && /^[0-9a-f]+$/i.test(hash)) {
    const passwordHash = await hashPassword(password);
    return passwordHash === hash;
  }
  
  // Fallback para hash simple
  return atob(hash) === password;
}

// Crear usuario
export async function createUser(
  username: string,
  password: string,
  role: User['role']
): Promise<User> {
  const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const passwordHash = await hashPassword(password);
  const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.reports_access;

  const newUser: Omit<User, 'id'> = {
    username,
    password_hash: passwordHash,
    role,
    permissions,
    active: true,
  };

  if (isSupabaseEnabled) {
    const { data, error } = await supabase!
      .from('users')
      .insert({
        id: userId,
        ...newUser,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    // Fallback a localStorage
    if (typeof window === 'undefined') throw new Error('Cannot create user on server');
    
    const STORAGE_KEY = 'chillapp_users';
    const stored = localStorage.getItem(STORAGE_KEY);
    const users: User[] = stored ? JSON.parse(stored) : [];
    
    const user: User = {
      id: userId,
      ...newUser,
    };
    
    users.push(user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    return user;
  }
}

// Obtener usuario por username
export async function getUserByUsername(username: string): Promise<User | null> {
  if (isSupabaseEnabled) {
    try {
      const { data, error } = await supabase!
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
    } catch (err) {
      console.error('Exception fetching user:', err);
      return null;
    }
  } else {
    // Fallback a localStorage
    if (typeof window === 'undefined') return null;
    
    const STORAGE_KEY = 'chillapp_users';
    const stored = localStorage.getItem(STORAGE_KEY);
    const users: User[] = stored ? JSON.parse(stored) : [];
    
    return users.find(u => u.username === username && u.active) || null;
  }
}

// Obtener todos los usuarios (solo para admins)
export async function getAllUsers(): Promise<User[]> {
  if (isSupabaseEnabled) {
    const { data, error } = await supabase!
      .from('users')
      .select('*')
      .order('username', { ascending: true });

    if (error) return [];
    return data || [];
  } else {
    // Fallback a localStorage
    if (typeof window === 'undefined') return [];
    
    const STORAGE_KEY = 'chillapp_users';
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }
}

// Actualizar usuario
export async function updateUser(
  userId: string,
  updates: Partial<Omit<User, 'id' | 'password_hash'>> & { password?: string }
): Promise<void> {
  // Crear objeto de actualización sin incluir password directamente
  const updateData: any = {};
  
  // Solo incluir campos que existen en la tabla users
  if (updates.username !== undefined) updateData.username = updates.username;
  if (updates.role !== undefined) updateData.role = updates.role;
  if (updates.active !== undefined) updateData.active = updates.active;
  if (updates.email !== undefined) updateData.email = updates.email;
  if (updates.phone !== undefined) updateData.phone = updates.phone;
  if (updates.profile_picture !== undefined) updateData.profile_picture = updates.profile_picture;
  
  // Manejar password: convertir a password_hash si se proporciona
  if (updates.password && updates.password.trim() !== '') {
    updateData.password_hash = await hashPassword(updates.password);
  }
  
  // Solo actualizar permisos automáticamente si se cambia el rol Y no se están pasando permisos personalizados
  if (updates.role && !updates.permissions) {
    updateData.permissions = ROLE_PERMISSIONS[updates.role] || ROLE_PERMISSIONS.reports_access;
  }
  
  // Si se pasan permisos personalizados, usarlos (pueden sobrescribir los del rol)
  if (updates.permissions) {
    updateData.permissions = updates.permissions;
  }

  if (isSupabaseEnabled) {
    const { error } = await supabase!
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (error) throw error;
  } else {
    // Fallback a localStorage
    if (typeof window === 'undefined') throw new Error('Cannot update user on server');
    
    const STORAGE_KEY = 'chillapp_users';
    const stored = localStorage.getItem(STORAGE_KEY);
    const users: User[] = stored ? JSON.parse(stored) : [];
    
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
      users[index] = { ...users[index], ...updateData };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    }
  }
}

// Eliminar usuario (desactivar)
export async function deleteUser(userId: string): Promise<void> {
  if (isSupabaseEnabled) {
    const { error } = await supabase!
      .from('users')
      .update({ active: false })
      .eq('id', userId);

    if (error) throw error;
  } else {
    // Fallback a localStorage
    if (typeof window === 'undefined') throw new Error('Cannot delete user on server');
    
    const STORAGE_KEY = 'chillapp_users';
    const stored = localStorage.getItem(STORAGE_KEY);
    const users: User[] = stored ? JSON.parse(stored) : [];
    
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
      users[index].active = false;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    }
  }
}

// Autenticar usuario
export async function authenticateUser(username: string, password: string): Promise<User | null> {
  const user = await getUserByUsername(username);
  if (!user) return null;

  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) return null;

  // Actualizar last_login
  if (isSupabaseEnabled) {
    await supabase!
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);
  }

  return user;
}

// Generar token de reset de contraseña
export async function generateResetToken(username: string): Promise<string | null> {
  const user = await getUserByUsername(username);
  if (!user) return null;

  // Generar token aleatorio
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const expires = new Date();
  expires.setHours(expires.getHours() + 1); // Token válido por 1 hora

  const updateData = {
    reset_token: token,
    reset_token_expires: expires.toISOString(),
  };

  if (isSupabaseEnabled) {
    const { error } = await supabase!
      .from('users')
      .update(updateData)
      .eq('id', user.id);

    if (error) return null;
  } else {
    if (typeof window === 'undefined') return null;
    
    const STORAGE_KEY = 'chillapp_users';
    const stored = localStorage.getItem(STORAGE_KEY);
    const users: User[] = stored ? JSON.parse(stored) : [];
    
    const index = users.findIndex(u => u.id === user.id);
    if (index !== -1) {
      users[index] = { ...users[index], ...updateData };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    }
  }

  return token;
}

// Resetear contraseña con token
export async function resetPasswordWithToken(token: string, newPassword: string): Promise<boolean> {
  if (isSupabaseEnabled) {
    const { data: users, error: findError } = await supabase!
      .from('users')
      .select('*')
      .eq('reset_token', token)
      .gt('reset_token_expires', new Date().toISOString());

    if (findError || !users || users.length === 0) return false;

    const user = users[0];
    const passwordHash = await hashPassword(newPassword);

    const { error: updateError } = await supabase!
      .from('users')
      .update({
        password_hash: passwordHash,
        reset_token: null,
        reset_token_expires: null,
      })
      .eq('id', user.id);

    return !updateError;
  } else {
    if (typeof window === 'undefined') return false;
    
    const STORAGE_KEY = 'chillapp_users';
    const stored = localStorage.getItem(STORAGE_KEY);
    const users: User[] = stored ? JSON.parse(stored) : [];
    
    const user = users.find(u => u.reset_token === token && u.reset_token_expires && new Date(u.reset_token_expires) > new Date());
    if (!user) return false;

    const passwordHash = await hashPassword(newPassword);
    const index = users.findIndex(u => u.id === user.id);
    
    if (index !== -1) {
      users[index] = {
        ...users[index],
        password_hash: passwordHash,
        reset_token: undefined,
        reset_token_expires: undefined,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
      return true;
    }
    
    return false;
  }
}

// Verificar permisos
export function hasPermission(user: User | null, permission: keyof UserPermissions): boolean {
  if (!user || !user.active) return false;
  if (user.role === 'admin') return true;
  // Verificar que permissions exista y que el permiso específico sea true
  if (!user.permissions) return false;
  return user.permissions[permission] === true;
}

