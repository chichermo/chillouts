'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, hasPermission, refreshCurrentUserFromDb } from '@/lib/auth';

/** Redirect naar de externe O2-app via portal SSO. */
export default function O2PortalRedirectPage() {
  const router = useRouter();
  const [message, setMessage] = useState('O2 openen…');

  useEffect(() => {
    const go = async () => {
      const fresh = await refreshCurrentUserFromDb();
      const user = fresh || getCurrentUser();
      if (!user || !hasPermission(user, 'portal_o2')) {
        router.replace('/portals');
        return;
      }
      try {
        const res = await fetch('/api/portal-sso', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target: 'o2',
            username: user.username,
            role: user.role,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data?.url) {
          throw new Error(data?.error || 'SSO mislukt');
        }
        window.location.href = data.url;
      } catch {
        setMessage('Kon O2 niet openen. Ga terug naar Element.');
        setTimeout(() => router.replace('/portals'), 1500);
      }
    };
    go();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#14141f] text-white">
      <p className="text-sm text-white/60">{message}</p>
    </div>
  );
}
