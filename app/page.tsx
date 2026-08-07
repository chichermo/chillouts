'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';

/** Entrada del portaal Element: login of apps-hub, nooit direct naar Chill-outs dashboard. */
export default function RootGate() {
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/portals');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1a1a28] text-white">
      Laden…
    </div>
  );
}
