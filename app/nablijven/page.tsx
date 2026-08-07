'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Nablijven/Detentions solo via Element — niet meer in Chill-outs menu. */
export default function NablijvenRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/portals');
  }, [router]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1a1a28] text-white">
      Doorsturen naar Element…
    </div>
  );
}
