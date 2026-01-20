'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAuthenticated, getCurrentUser, hasPermission } from '@/lib/auth';
import type { UserPermissions } from '@/lib/users';

// Mapeo de rutas a permisos requeridos
const ROUTE_PERMISSIONS: { [path: string]: keyof UserPermissions } = {
  '/daily': 'dagelijks',
  '/weekly': 'weekoverzicht',
  '/stats': 'statistieken',
  '/import': 'rapporten',
  '/students': 'students',
  '/audit': 'audit',
  '/users': 'students', // Solo admins pueden acceder
};

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // No proteger la ruta de login, create-users o reset-password
    if (pathname === '/login' || pathname === '/create-users' || pathname === '/reset-password') {
      setIsChecking(false);
      return;
    }

    // Verificar autenticación
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    // Verificar permisos para rutas específicas
    const user = getCurrentUser();
    
    // Verificar rutas dinámicas primero
    if (pathname?.startsWith('/daily/')) {
      // Ruta dinámica /daily/[date] requiere permiso dagelijks
      if (!user || !hasPermission(user, 'dagelijks')) {
        router.push('/');
        return;
      }
    } else {
      // Verificar rutas que requieren ser admin
      if (pathname === '/users' || pathname === '/nablijven') {
        if (!user || user.role !== 'admin') {
          router.push('/');
          return;
        }
      } else {
        // Verificar rutas estáticas con permisos
        const requiredPermission = ROUTE_PERMISSIONS[pathname || ''];
        if (requiredPermission) {
          if (!user || !hasPermission(user, requiredPermission)) {
            router.push('/');
            return;
          }
        }
      }
    }

    setIsChecking(false);
  }, [router, pathname]);

  // Mostrar nada mientras se verifica (o un loader si prefieres)
  if (isChecking && pathname !== '/login' && pathname !== '/create-users' && pathname !== '/reset-password') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#2a2a3a]">
        <div className="text-white">Laden...</div>
      </div>
    );
  }

  return <>{children}</>;
}

