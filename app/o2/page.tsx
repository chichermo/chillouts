'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { O2_APP_URL } from '@/lib/portals';
import { getCurrentUser, hasPermission, refreshCurrentUserFromDb } from '@/lib/auth';

/** Redirect naar de externe O2-app (gedeelde Element-portalen). */
export default function O2PortalRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const go = async () => {
      const fresh = await refreshCurrentUserFromDb();
      const user = fresh || getCurrentUser();
      if (!user || !hasPermission(user, 'portal_o2')) {
        router.replace('/portals');
        return;
      }
      window.location.href = O2_APP_URL;
    };
    go();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#14141f] text-white">
      <p className="text-sm text-white/60">O2 openen…</p>
    </div>
  );
}
