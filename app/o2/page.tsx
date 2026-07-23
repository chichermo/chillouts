'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function O2ComingSoonPage() {
  return (
    <div className="min-h-screen bg-[#1a1a28] text-white">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 text-center">
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
          <Image src="/logo.jpg" alt="Element" width={160} height={60} className="h-10 w-auto" />
        </div>
        <p className="mb-2 text-xs tracking-[0.2em] text-white/45 uppercase">O2</p>
        <h1 className="text-3xl font-black md:text-4xl">Binnenkort beschikbaar</h1>
        <p className="mt-4 text-white/65">
          De O2-app (incidenten met impact) wordt apart opgezet. Zodra die klaar is, opent dit
          portaal de app zonder opnieuw in te loggen.
        </p>
        <Link
          href="/portals"
          className="mt-8 rounded-2xl bg-[#C2E0FC] px-5 py-3 font-semibold text-[#1a1a28] transition hover:brightness-105"
        >
          Terug naar portalen
        </Link>
      </div>
    </div>
  );
}
