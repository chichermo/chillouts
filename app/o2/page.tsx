'use client';

import Link from 'next/link';
import Image from 'next/image';
import PortalMark from '@/components/PortalMark';

export default function O2ComingSoonPage() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#14141f] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-20 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[#C2E0FC]/20 blur-[90px]" />
      </div>
      <div className="relative z-10 mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 text-center">
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-3">
          <Image src="/logo.jpg" alt="Element" width={140} height={48} className="h-9 w-auto" />
        </div>
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[1.75rem] border border-white/10 bg-[#C2E0FC]/15">
          <PortalMark id="o2" className="h-20 w-20" />
        </div>
        <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-white/45 uppercase">O2</p>
        <h1 className="text-3xl font-black md:text-4xl">Binnenkort beschikbaar</h1>
        <p className="mt-4 text-white/60 leading-relaxed">
          De O2-app (incidenten met impact) wordt apart opgezet. Zodra die klaar is, opent dit
          portaal de app zonder opnieuw in te loggen.
        </p>
        <Link
          href="/portals"
          className="mt-8 rounded-2xl bg-[#C2E0FC] px-5 py-3 font-semibold text-[#14141f] transition hover:brightness-105"
        >
          Terug naar portalen
        </Link>
      </div>
    </div>
  );
}
