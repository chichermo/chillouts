'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAuthenticated, getCurrentUser, hasPermission, refreshCurrentUserFromDb } from '@/lib/auth';
import type { UserPermissions } from '@/lib/users';

const PUBLIC_PATHS = new Set(['/login', '/create-users', '/reset-password']);

const ROUTE_PERMISSIONS: { [path: string]: keyof UserPermissions } = {
  '/daily': 'dagelijks',
  '/weekly': 'weekoverzicht',
  '/stats': 'statistieken',
  '/import': 'rapporten',
  '/backup': 'backup',
  '/students': 'students',
  '/audit': 'audit',
  '/users': 'students',
};

/** Rutas internas de Chill-outs (requieren portal_chillouts). */
function isChilloutsAppPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (
    pathname === '/' ||
    pathname === '/portals' ||
    pathname === '/o2' ||
    pathname === '/login'
  ) {
    return false;
  }
  if (pathname.startsWith('/api/')) return false;
  return true;
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const verifyAccess = async () => {
      if (PUBLIC_PATHS.has(pathname || '')) {
        setIsChecking(false);
        return;
      }

      // Raíz: gate a login o portales (sin dashboard)
      if (pathname === '/') {
        if (isAuthenticated()) router.replace('/portals');
        else router.replace('/login');
        return;
      }

      // Nablijven ya no vive en el menú Chill-outs → solo vía portal Detentions
      if (pathname === '/nablijven') {
        if (isAuthenticated()) router.replace('/portals');
        else router.replace('/login');
        return;
      }

      if (!isAuthenticated()) {
        router.push('/login');
        return;
      }

      await refreshCurrentUserFromDb();
      if (cancelled) return;

      const user = getCurrentUser();

      if (pathname === '/portals' || pathname === '/o2') {
        if (pathname === '/o2' && (!user || !hasPermission(user, 'portal_o2'))) {
          router.push('/portals');
          return;
        }
        setIsChecking(false);
        return;
      }

      if (isChilloutsAppPath(pathname)) {
        if (!user || !hasPermission(user, 'portal_chillouts')) {
          router.push('/portals');
          return;
        }
      }

      if (pathname?.startsWith('/daily/')) {
        if (!user || !hasPermission(user, 'dagelijks')) {
          router.push('/portals');
          return;
        }
      } else if (
        pathname === '/users' ||
        pathname === '/timetables' ||
        pathname?.startsWith('/admin/')
      ) {
        if (!user || user.role !== 'admin') {
          router.push('/portals');
          return;
        }
      } else {
        const requiredPermission = ROUTE_PERMISSIONS[pathname || ''];
        if (requiredPermission) {
          if (!user || !hasPermission(user, requiredPermission)) {
            router.push('/portals');
            return;
          }
        }
      }

      setIsChecking(false);
    };

    verifyAccess();
    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  if (
    isChecking &&
    !PUBLIC_PATHS.has(pathname || '') &&
    pathname !== '/' &&
    pathname !== '/nablijven'
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a28]">
        <div className="text-white">Laden...</div>
      </div>
    );
  }

  return <>{children}</>;
}
