'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // No proteger la ruta de login
    if (pathname === '/login') {
      setIsChecking(false);
      return;
    }

    // Verificar autenticación
    if (!isAuthenticated()) {
      router.push('/login');
    } else {
      setIsChecking(false);
    }
  }, [router, pathname]);

  // Mostrar nada mientras se verifica (o un loader si prefieres)
  if (isChecking && pathname !== '/login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#2a2a3a]">
        <div className="text-white">Laden...</div>
      </div>
    );
  }

  return <>{children}</>;
}

