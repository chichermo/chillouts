'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';

export default function NablijvenPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-brand-pink/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-brand-green/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-orange/20 rounded-full blur-3xl"></div>
      </div>
      
      <Navigation />
      <div className="container mx-auto px-4 py-12 relative z-10">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
            Nablijven Systeem
          </h1>
          <p className="text-lg text-white/80 font-medium">
            Beheer van nablijven (16:00 - 16:50)
          </p>
        </div>

        {/* Backup Section */}
        <div className="mb-8 max-w-4xl mx-auto">
          <div className="glass-effect rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">Backup</h2>
            <p className="text-white/70 text-sm">
              Backup functionaliteit voor nablijven gegevens
            </p>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="max-w-6xl mx-auto mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Leerlingen */}
            <Link
              href="#"
              className="group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/10 rounded-3xl blur-2xl group-hover:blur-3xl transition-all"></div>
              <div className="relative glass-effect rounded-3xl p-8 border border-white/20 hover:border-white/30 transition-all hover:scale-[1.02] h-full">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center shadow-xl shadow-white/20 group-hover:scale-110 transition-transform">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                    <svg className="w-5 h-5 text-white group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-2xl font-black text-white mb-3 group-hover:text-white/90 transition-colors">
                  Leerlingen
                </h2>
                <p className="text-white/90 text-sm leading-relaxed">
                  Beheer lijsten van leerlingen per dag
                </p>
              </div>
            </Link>

            {/* Beheer lijsten van leerlingen per dag */}
            <Link
              href="#"
              className="group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/10 rounded-3xl blur-2xl group-hover:blur-3xl transition-all"></div>
              <div className="relative glass-effect rounded-3xl p-8 border border-white/20 hover:border-white/30 transition-all hover:scale-[1.02] h-full">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center shadow-xl shadow-white/20 group-hover:scale-110 transition-transform">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                    <svg className="w-5 h-5 text-white group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-2xl font-black text-white mb-3 group-hover:text-white/90 transition-colors">
                  Beheer lijsten
                </h2>
                <p className="text-white/90 text-sm leading-relaxed">
                  Bekijken lijsten van leerlingen per dag
                </p>
              </div>
            </Link>

            {/* Nieuw Nablijven */}
            <Link
              href="#"
              className="group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/10 rounded-3xl blur-2xl group-hover:blur-3xl transition-all"></div>
              <div className="relative glass-effect rounded-3xl p-8 border border-white/20 hover:border-white/30 transition-all hover:scale-[1.02] h-full">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center shadow-xl shadow-white/20 group-hover:scale-110 transition-transform">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                    <svg className="w-5 h-5 text-white group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-2xl font-black text-white mb-3 group-hover:text-white/90 transition-colors">
                  Nieuw Nablijven
                </h2>
                <p className="text-white/90 text-sm leading-relaxed">
                  Registreer een nieuwe nablijven sessie
                </p>
              </div>
            </Link>

            {/* Kalender */}
            <Link
              href="#"
              className="group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/10 rounded-3xl blur-2xl group-hover:blur-3xl transition-all"></div>
              <div className="relative glass-effect rounded-3xl p-8 border border-white/20 hover:border-white/30 transition-all hover:scale-[1.02] h-full">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center shadow-xl shadow-white/20 group-hover:scale-110 transition-transform">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                    <svg className="w-5 h-5 text-white group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-2xl font-black text-white mb-3 group-hover:text-white/90 transition-colors">
                  Kalender
                </h2>
                <p className="text-white/90 text-sm leading-relaxed">
                  Bekijk alle nablijven sessies
                </p>
              </div>
            </Link>

            {/* Dashboard */}
            <Link
              href="#"
              className="group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/10 rounded-3xl blur-2xl group-hover:blur-3xl transition-all"></div>
              <div className="relative glass-effect rounded-3xl p-8 border border-white/20 hover:border-white/30 transition-all hover:scale-[1.02] h-full">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center shadow-xl shadow-white/20 group-hover:scale-110 transition-transform">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                    <svg className="w-5 h-5 text-white group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-2xl font-black text-white mb-3 group-hover:text-white/90 transition-colors">
                  Dashboard
                </h2>
                <p className="text-white/90 text-sm leading-relaxed">
                  Overzicht en KPIs in real-time
                </p>
              </div>
            </Link>

            {/* Statistieken */}
            <Link
              href="#"
              className="group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/10 rounded-3xl blur-2xl group-hover:blur-3xl transition-all"></div>
              <div className="relative glass-effect rounded-3xl p-8 border border-white/20 hover:border-white/30 transition-all hover:scale-[1.02] h-full">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center shadow-xl shadow-white/20 group-hover:scale-110 transition-transform">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                    <svg className="w-5 h-5 text-white group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-2xl font-black text-white mb-3 group-hover:text-white/90 transition-colors">
                  Statistieken
                </h2>
                <p className="text-white/90 text-sm leading-relaxed">
                  Analyse en rapporten met export
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Recente Sessies Section */}
        <div className="max-w-4xl mx-auto">
          <div className="glass-effect rounded-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Recente Sessies</h2>
            {mounted ? (
              <div className="text-center py-12">
                <p className="text-white/60 text-lg mb-4">0 sessies gevonden</p>
                <p className="text-white/50 text-sm mb-6">Geen sessies geregistreerd.</p>
                <Link
                  href="#"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/20"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Eerste sessie aanmaken
                </Link>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-white/60">Laden...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
