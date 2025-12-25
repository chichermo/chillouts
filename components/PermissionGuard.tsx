'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import type { UserPermissions } from '@/lib/users';

export default function PermissionGuard({ 
  children, 
  permission 
}: { 
  children: React.ReactNode;
  permission: keyof UserPermissions;
}) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    
    if (!user) {
      router.push('/login');
      return;
    }

    if (!hasPermission(user, permission)) {
      router.push('/');
      return;
    }

    setIsChecking(false);
  }, [router, permission]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#2a2a3a]">
        <div className="text-white">Laden...</div>
      </div>
    );
  }

  return <>{children}</>;
}

