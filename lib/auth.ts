// Utilidades de autenticación
import { authenticateUser, getUserByUsername, hasPermission as checkPermission, type User, type UserPermissions } from './users';

// Mantener compatibilidad con el usuario Admin inicial
export const AUTH_USERNAME = 'Admin';
export const AUTH_PASSWORD = 'Perritopony555';

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('isAuthenticated') === 'true';
}

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('currentUser');
  return userStr ? JSON.parse(userStr) : null;
}

export function isAdmin(): boolean {
  const user = getCurrentUser();
  return user?.role === 'admin' || false;
}

export async function login(username: string, password: string): Promise<boolean> {
  // Primero intentar con el usuario Admin hardcoded (compatibilidad)
  if (username === AUTH_USERNAME && password === AUTH_PASSWORD) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('username', username);
      // Crear objeto de usuario admin temporal
      const adminUser: User = {
        id: 'admin_temp',
        username: 'Admin',
        password_hash: '',
        role: 'admin',
        permissions: {
          dagelijks: true,
          weekoverzicht: true,
          statistieken: true,
          rapporten: true,
          students: true,
          audit: true,
        },
        active: true,
      };
      localStorage.setItem('currentUser', JSON.stringify(adminUser));
      return true;
    }
  }

  // Intentar autenticar con usuarios de la base de datos
  try {
    const user = await authenticateUser(username, password);
    if (user) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('username', user.username);
        localStorage.setItem('currentUser', JSON.stringify(user));
      }
      return true;
    }
  } catch (error) {
    console.error('Error authenticating user:', error);
  }

  return false;
}

export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('username');
    localStorage.removeItem('currentUser');
  }
}

export function getUsername(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('username');
}

// Re-exportar hasPermission para mantener consistencia en las importaciones
export function hasPermission(user: User | null, permission: keyof UserPermissions): boolean {
  return checkPermission(user, permission);
}

