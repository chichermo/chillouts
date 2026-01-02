'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { login, isAuthenticated } from '@/lib/auth';
import { AUTH_USERNAME, AUTH_PASSWORD } from '@/lib/auth';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Si ya está autenticado, redirigir a la página principal
    if (isAuthenticated()) {
      router.push('/');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simular un pequeño delay para mejor UX
    await new Promise(resolve => setTimeout(resolve, 500));

    const success = await login(username, password);
    if (success) {
      // Redirigir a la página principal
      router.push('/');
    } else {
      setError('Gebruikersnaam of wachtwoord is onjuist');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#2a2a3a]">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-brand-pink/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-brand-green/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-orange/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo y nombre de la app */}
        <div className="text-center mb-8">
          <div className="inline-block mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-white/5 rounded-2xl blur-xl opacity-50"></div>
              <div className="relative py-8">
                <Logo variant="full" showElements={true} />
              </div>
            </div>
          </div>
        </div>

        {/* Formulario de login */}
        <div className="glass-effect rounded-3xl p-8 border border-white/20 shadow-2xl">
          <h1 className="text-2xl font-black text-white mb-6 text-center">
            Inloggen
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campo Usuario */}
            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-white/90 mb-2">
                Gebruikersnaam
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all"
                placeholder="Voer uw gebruikersnaam in"
                required
                autoComplete="username"
              />
            </div>

            {/* Campo Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-white/90 mb-2">
                Wachtwoord
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all"
                placeholder="Voer uw wachtwoord in"
                required
                autoComplete="current-password"
              />
            </div>

            {/* Foutmelding */}
            {error && (
              <div className="p-3 rounded-xl bg-brand-pink/20 border border-brand-pink/30 text-white text-sm text-center">
                {error}
              </div>
            )}

            {/* Botón de submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 text-white font-semibold transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg"
            >
              {isLoading ? 'Inloggen...' : 'Inloggen'}
            </button>

            {/* Link para reset de contraseña */}
            <div className="text-center mt-4">
              <Link
                href="/reset-password"
                className="text-sm text-white/70 hover:text-white transition-colors underline"
              >
                Wachtwoord vergeten?
              </Link>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-white/60 text-sm mt-6">
          Element - STERK IN VERBINDING
        </p>
      </div>
    </div>
  );
}

