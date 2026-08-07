'use client';

import { FormEvent, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { isAuthenticated, login } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) router.replace('/portals');
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const success = await login(username.trim(), password);
      if (success) {
        router.replace('/portals');
        return;
      }
      setError('Gebruikersnaam of wachtwoord is onjuist');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#1a1a28] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-16 h-80 w-80 rounded-full bg-[#ACE1AF]/25 blur-3xl" />
        <div className="absolute top-1/3 -right-20 h-96 w-96 rounded-full bg-[#C2E0FC]/20 blur-3xl" />
        <div className="absolute -bottom-28 left-1/3 h-80 w-80 rounded-full bg-[#E897A3]/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.45) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-4 py-10 md:px-8 lg:flex-row lg:items-center lg:gap-16">
        <section className="mb-10 max-w-xl lg:mb-0 lg:flex-1">
          <p className="mb-4 text-sm font-semibold tracking-[0.2em] text-white/55 uppercase">
            Element · Sterk in verbinding
          </p>
          <div className="mb-6 inline-flex rounded-2xl border border-white/15 bg-white/5 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md">
            <Image
              src="/logo.jpg"
              alt="Element"
              width={280}
              height={120}
              priority
              className="h-auto w-[220px] object-contain md:w-[280px]"
            />
          </div>
          <h1 className="text-4xl font-black leading-tight tracking-tight text-white md:text-5xl">
            Welkom bij het
            <span className="block bg-gradient-to-r from-[#ACE1AF] via-[#C2E0FC] to-[#E897A3] bg-clip-text text-transparent">
              Element portaal
            </span>
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-white/70">
            Eén login voor Chill-outs, Nablijven en O2. Je ziet alleen de apps waarvoor je
            toegang hebt.
          </p>
        </section>

        <section className="w-full max-w-md lg:flex-none">
          <div className="rounded-3xl border border-white/15 bg-[#222233]/80 p-7 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl md:p-8">
            <h2 className="mb-1 text-2xl font-bold text-white">Inloggen</h2>
            <p className="mb-6 text-sm text-white/60">Gebruik je Element-account</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="username" className="mb-2 block text-sm font-medium text-white/80">
                  Gebruikersnaam
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3.5 text-white placeholder-white/35 outline-none transition focus:border-[#ACE1AF]/60 focus:ring-2 focus:ring-[#ACE1AF]/25"
                  placeholder="voornaam.achternaam"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-white/80">
                  Wachtwoord
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3.5 pr-12 text-white placeholder-white/35 outline-none transition focus:border-[#ACE1AF]/60 focus:ring-2 focus:ring-[#ACE1AF]/25"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs text-white/55 hover:text-white"
                  >
                    {showPassword ? 'Verberg' : 'Toon'}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-2xl border border-[#E897A3]/40 bg-[#E897A3]/15 px-4 py-3 text-center text-sm text-white">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-2xl bg-gradient-to-r from-[#ACE1AF] to-[#7ec98a] px-4 py-3.5 font-bold text-[#1a1a28] shadow-lg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? 'Bezig…' : 'Naar Element'}
              </button>

              <div className="text-center">
                <Link
                  href="/reset-password"
                  className="text-sm text-white/55 underline-offset-2 hover:text-white hover:underline"
                >
                  Wachtwoord vergeten?
                </Link>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
