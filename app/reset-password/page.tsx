'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';
import { resetPasswordWithToken, generateResetToken } from '@/lib/users';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [step, setStep] = useState<'request' | 'reset'>(token ? 'reset' : 'request');
  const [username, setUsername] = useState('');
  const [resetToken, setResetToken] = useState(token || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const token = await generateResetToken(username);
      if (token) {
        // En producción, aquí enviarías el token por email
        // Por ahora, lo mostramos en pantalla para desarrollo
        setSuccess(`Reset token gegenereerd. Token: ${token}`);
        setResetToken(token);
        setStep('reset');
      } else {
        setError('Gebruikersnaam niet gevonden');
      }
    } catch (err) {
      setError('Fout bij het genereren van reset token');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!resetToken) {
      setError('Reset token is vereist');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError('Vul alle velden in');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Wachtwoorden komen niet overeen');
      return;
    }

    if (newPassword.length < 6) {
      setError('Wachtwoord moet minimaal 6 tekens lang zijn');
      return;
    }

    setLoading(true);

    try {
      const success = await resetPasswordWithToken(resetToken, newPassword);
      if (success) {
        setSuccess('Wachtwoord succesvol gewijzigd. U wordt doorgestuurd naar de login pagina...');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setError('Ongeldig of verlopen reset token');
      }
    } catch (err) {
      setError('Fout bij het wijzigen van wachtwoord');
    } finally {
      setLoading(false);
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
        {/* Logo */}
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

        {/* Formulario */}
        <div className="glass-effect rounded-3xl p-8 border border-white/20 shadow-2xl">
          <h1 className="text-2xl font-black text-white mb-6 text-center">
            {step === 'request' ? 'Wachtwoord Resetten' : 'Nieuw Wachtwoord Instellen'}
          </h1>

          {step === 'request' ? (
            <form onSubmit={handleRequestReset} className="space-y-6">
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
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-white text-sm text-center">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 rounded-xl bg-green-500/20 border border-green-500/30 text-white text-sm">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 text-white font-semibold transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg"
              >
                {loading ? 'Verzenden...' : 'Reset Token Aanvragen'}
              </button>

              <button
                type="button"
                onClick={() => router.push('/login')}
                className="w-full py-2 text-white/70 hover:text-white text-sm transition-colors"
              >
                Terug naar inloggen
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6">
              {!token && (
                <div>
                  <label htmlFor="token" className="block text-sm font-semibold text-white/90 mb-2">
                    Reset Token
                  </label>
                  <input
                    id="token"
                    type="text"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all"
                    placeholder="Voer uw reset token in"
                    required
                  />
                </div>
              )}

              <div>
                <label htmlFor="newPassword" className="block text-sm font-semibold text-white/90 mb-2">
                  Nieuw Wachtwoord
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all"
                  placeholder="Minimaal 6 tekens"
                  required
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-white/90 mb-2">
                  Bevestig Wachtwoord
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all"
                  placeholder="Bevestig uw nieuwe wachtwoord"
                  required
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-white text-sm text-center">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 rounded-xl bg-green-500/20 border border-green-500/30 text-white text-sm text-center">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 text-white font-semibold transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg"
              >
                {loading ? 'Wijzigen...' : 'Wachtwoord Wijzigen'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('request');
                  setResetToken('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="w-full py-2 text-white/70 hover:text-white text-sm transition-colors"
              >
                Terug
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-white/60 text-sm mt-6">
          Element - STERK IN VERBINDING
        </p>
      </div>
    </div>
  );
}

