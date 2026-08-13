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
import { getDetentionsAccessScope } from '@/lib/users';
import PortalMark from '@/components/PortalMark';
import type { User } from '@/lib/users';

export default function PortalsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
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

    if (portal.id === 'chillouts') {
      if (!hasPermission(user, 'portal_chillouts')) {
        setError('Geen toegang tot Chill-outs.');
        return;
      }
      setOpening(portal.id);
      router.push('/dashboard');
      return;
    }

    if (portal.id === 'detentions' || portal.id === 'o2') {
      if (!user) return;
      if (portal.id === 'detentions') {
        const scope = getDetentionsAccessScope(user);
        if (scope === 'none') {
          setError('Geen toegang tot Nablijven.');
          return;
        }
        setOpening(portal.id);
        try {
          const res = await fetch('/api/portal-sso', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              target: portal.id,
              username: user.username,
              role: user.role,
              detentionsScope: scope,
            }),
          });
          const data = await res.json();
          if (!res.ok || !data?.url) {
            throw new Error(data?.error || 'Aanmelden mislukt');
          }
          window.location.href = data.url;
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Kon Nablijven niet openen');
          setOpening(null);
        }
        return;
      }
      setOpening(portal.id);
      try {
        const res = await fetch('/api/portal-sso', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target: portal.id,
            username: user.username,
            role: user.role,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data?.url) {
          throw new Error(data?.error || 'Aanmelden mislukt');
        }
        window.location.href = data.url;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Kon O2 niet openen');
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
      <div className="flex min-h-screen items-center justify-center bg-[#14141f] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-[#ACE1AF]/40" />
          <p className="text-sm text-white/60">Apps laden…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#14141f] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-20 h-[28rem] w-[28rem] rounded-full bg-[#ACE1AF]/20 blur-[100px]" />
        <div className="absolute top-1/4 -right-24 h-[32rem] w-[32rem] rounded-full bg-[#C2E0FC]/18 blur-[110px]" />
        <div className="absolute -bottom-40 left-1/3 h-[26rem] w-[26rem] rounded-full bg-[#FFDFB9]/12 blur-[90px]" />
        <div
          className="absolute inset-0 opacity-[0.045]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-end px-4 pt-6 md:px-8">
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-xl border border-white/12 bg-white/[0.04] px-3.5 py-2 text-sm text-white/70 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
        >
          Uitloggen
        </button>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-20 pt-2 md:px-8">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-5 rounded-3xl border border-white/12 bg-white/[0.07] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur-md md:p-6">
            <Image
              src="/logo.jpg"
              alt="Element"
              width={320}
              height={140}
              priority
              className="h-auto w-[200px] object-contain md:w-[280px]"
            />
          </div>
          <p className="text-[11px] font-semibold tracking-[0.28em] text-white/40 uppercase">
            Element · Sterk in verbinding
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
            Kies je{' '}
            <span className="bg-gradient-to-r from-[#ACE1AF] via-[#C2E0FC] to-[#FFDFB9] bg-clip-text text-transparent">
              app
            </span>
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/55">
            Welkom,{' '}
            <span className="font-semibold text-white/85">{user?.username || 'gebruiker'}</span>
            {' — '}
            Element-apps: Chill-outs, Nablijven en O2.
          </p>
        </div>

        {error && (
          <div className="mb-8 rounded-2xl border border-[#E897A3]/35 bg-[#E897A3]/12 px-4 py-3 text-sm text-white">
            {error}
          </div>
        )}

        {portals.length === 0 ? (
          <div className="rounded-3xl border border-white/12 bg-white/[0.04] p-10 text-white/70">
            Er zijn nog geen apps aan jouw account gekoppeld. Vraag een beheerder om toegang
            via Gebruikers.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {portals.map((portal, index) => {
              const isHovered = hovered === portal.id;
              const isOpening = opening === portal.id;
              return (
                <button
                  key={portal.id}
                  type="button"
                  onClick={() => openPortal(portal)}
                  onMouseEnter={() => setHovered(portal.id)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(portal.id)}
                  onBlur={() => setHovered(null)}
                  disabled={isOpening}
                  className="group relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#1c1c2a]/80 p-7 text-left shadow-[0_24px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all duration-500 ease-out hover:-translate-y-2 hover:border-white/25 hover:shadow-[0_36px_80px_rgba(0,0,0,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:opacity-70 animate-[portalIn_0.55s_ease-out_both]"
                  style={{
                    animationDelay: `${index * 0.1}s`,
                  }}
                >
                  <div
                    className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                    style={{ background: portal.accent }}
                  />
                  <div
                    className="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-50 transition-transform duration-500 group-hover:scale-x-100"
                    style={{ background: portal.accent }}
                  />

                  <div className="relative flex items-start justify-between gap-3">
                    <div
                      className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-3xl border border-white/10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-[-3deg]"
                      style={{
                        background: `linear-gradient(145deg, ${portal.accent}33, transparent)`,
                        boxShadow: isHovered ? `0 12px 40px ${portal.accent}44` : undefined,
                      }}
                    >
                      <PortalMark id={portal.id} className="h-14 w-14" />
                    </div>
                    {portal.comingSoon && (
                      <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white/55 uppercase">
                        Binnenkort
                      </span>
                    )}
                  </div>

                  <h2 className="relative mt-6 text-2xl font-black tracking-tight text-white md:text-[1.75rem]">
                    {portal.title}
                  </h2>
                  <p className="relative mt-2 min-h-[3rem] text-sm leading-relaxed text-white/60">
                    {portal.subtitle}
                  </p>

                  <div className="relative mt-8 flex items-center justify-between">
                    <span
                      className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all duration-300 group-hover:gap-3"
                      style={{
                        background: `${portal.accent}22`,
                        color: portal.accent,
                      }}
                    >
                      {isOpening
                        ? 'App openen…'
                        : portal.comingSoon
                          ? 'Bekijken'
                          : 'Open app'}
                      <span
                        className="inline-block transition-transform duration-300 group-hover:translate-x-1"
                        aria-hidden
                      >
                        →
                      </span>
                    </span>
                    <span
                      className="h-10 w-10 rounded-full border border-white/10 bg-white/[0.04] transition-all duration-500 group-hover:scale-110 group-hover:border-white/25"
                      style={{
                        boxShadow: isHovered ? `inset 0 0 20px ${portal.accent}55` : undefined,
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {hasPermission(user, 'students') && user?.role === 'admin' && (
          <div className="mt-12">
            <Link
              href="/users"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm text-white/65 transition hover:bg-white/10 hover:text-white"
            >
              Apprechten beheren
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
