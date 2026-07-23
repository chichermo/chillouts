'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getCurrentUser,
  hasPermission,
  logout,
  refreshCurrentUserFromDb,
} from '@/lib/auth';
import { getVisiblePortals, type PortalDef } from '@/lib/portals';
import type { User } from '@/lib/users';

export default function PortalsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const fresh = await refreshCurrentUserFromDb();
      setUser(fresh || getCurrentUser());
      setLoading(false);
    };
    load();
  }, []);

  const portals = useMemo(() => getVisiblePortals(user), [user]);

  const openPortal = async (portal: PortalDef) => {
    setError('');
    if (portal.comingSoon && portal.id === 'o2') {
      router.push('/o2');
      return;
    }

    if (portal.id === 'chillouts') {
      if (!hasPermission(user, 'portal_chillouts')) {
        setError('Geen toegang tot Chill-outs.');
        return;
      }
      router.push('/dashboard');
      return;
    }

    if (portal.id === 'detentions') {
      if (!user) return;
      setOpening(portal.id);
      try {
        const res = await fetch('/api/portal-sso', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target: 'detentions',
            username: user.username,
            role: user.role,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data?.url) {
          throw new Error(data?.error || 'SSO mislukt');
        }
        window.location.href = data.url;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Kon Detentions niet openen');
        setOpening(null);
      }
      return;
    }

    if (portal.external) {
      window.location.href = portal.href;
      return;
    }
    router.push(portal.href);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1a1a28] text-white">
        Laden…
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#1a1a28] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 left-10 h-72 w-72 rounded-full bg-[#ACE1AF]/20 blur-3xl" />
        <div className="absolute bottom-10 right-0 h-96 w-96 rounded-full bg-[#C2E0FC]/15 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#E897A3]/10 blur-3xl" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6 md:px-8">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-2">
            <Image src="/logo.jpg" alt="Element" width={120} height={40} className="h-8 w-auto" />
          </div>
          <div>
            <p className="text-xs tracking-[0.18em] text-white/45 uppercase">Element portaal</p>
            <p className="text-sm text-white/80">
              Hallo, <span className="font-semibold text-white">{user?.username || 'gebruiker'}</span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          Uitloggen
        </button>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 md:px-8">
        <div className="mb-10 max-w-2xl">
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">Kies je app</h1>
          <p className="mt-3 text-white/65">
            Je sessie blijft actief — geen tweede login nodig. Alleen de portalen waarvoor je
            rechten hebt, worden getoond.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-[#E897A3]/40 bg-[#E897A3]/15 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {portals.length === 0 ? (
          <div className="rounded-3xl border border-white/15 bg-white/5 p-8 text-white/75">
            Er zijn nog geen portalen aan jouw account gekoppeld. Vraag een admin om toegang in
            Gebruikers.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {portals.map((portal, index) => (
              <button
                key={portal.id}
                type="button"
                onClick={() => openPortal(portal)}
                disabled={opening === portal.id}
                className="group relative overflow-hidden rounded-3xl border border-white/12 bg-[#222233]/75 p-6 text-left shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-[0_28px_60px_rgba(0,0,0,0.45)] disabled:opacity-70"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div
                  className="absolute inset-x-0 top-0 h-1 opacity-90 transition group-hover:h-1.5"
                  style={{ background: portal.accent }}
                />
                <div
                  className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10"
                  style={{ background: `${portal.accent}22` }}
                >
                  {portal.id === 'chillouts' && (
                    <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {portal.id === 'detentions' && (
                    <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                  {portal.id === 'o2' && (
                    <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-white">{portal.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/65">{portal.subtitle}</p>
                <div className="mt-6 flex items-center justify-between text-sm font-semibold">
                  <span style={{ color: portal.accent }}>
                    {opening === portal.id
                      ? 'Openen…'
                      : portal.comingSoon
                        ? 'Voorbereiden'
                        : 'Openen'}
                  </span>
                  <span className="text-white/40 transition group-hover:translate-x-1 group-hover:text-white/80">
                    →
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {hasPermission(user, 'students') && user?.role === 'admin' && (
          <div className="mt-10">
            <Link
              href="/users"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              Portaalrechten beheren (Gebruikers)
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
