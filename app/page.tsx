'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Logo from '@/components/Logo';
import { loadData } from '@/lib/storage';
import { formatDate, getDayName } from '@/lib/utils';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import type { UserPermissions } from '@/lib/users';

export default function Home() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [totalStudents, setTotalStudents] = useState(0);
  const [activeStudents, setActiveStudents] = useState(0);
  const [totalDays, setTotalDays] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null);

  const [totalChillOuts, setTotalChillOuts] = useState(0);
  const [todayChillOuts, setTodayChillOuts] = useState(0);

  const todayStr = formatDate(currentDate);
  const dayName = getDayName(currentDate);

  useEffect(() => {
    setMounted(true);
    setCurrentDate(new Date());
    setUser(getCurrentUser());
    
    // Cargar datos solo en el cliente
    const loadDataAsync = async () => {
      const data = await loadData();
      setTotalStudents(data.students.length);
      setActiveStudents(data.students.filter(s => s.status === 'Actief').length);
      setTotalDays(Object.keys(data.dailyRecords).length);
      
      // Calcular totales de chill-outs
      let total = 0;
      Object.values(data.dailyRecords).forEach(record => {
        Object.values(record.entries).forEach(studentEntries => {
          Object.values(studentEntries).forEach(entries => {
            if (Array.isArray(entries)) {
              total += entries.length;
            }
          });
        });
      });
      setTotalChillOuts(total);
      
      // Chill-outs de hoy
      const todayDate = new Date();
      const todayStrFormatted = formatDate(todayDate);
      const todayRecord = data.dailyRecords[todayStrFormatted];
      if (todayRecord) {
        let todayTotal = 0;
        Object.values(todayRecord.entries).forEach(studentEntries => {
          Object.values(studentEntries).forEach(entries => {
            if (Array.isArray(entries)) {
              todayTotal += entries.length;
            }
          });
        });
        setTodayChillOuts(todayTotal);
      } else {
        setTodayChillOuts(0);
      }
    };
    loadDataAsync();
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
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-block mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-white/10 rounded-2xl blur-xl opacity-50"></div>
              <div className="relative py-8">
                <Logo variant="full" showElements={true} />
              </div>
            </div>
          </div>
          <p className="text-subtitle text-white max-w-3xl mx-auto font-medium mt-4">
            Beheer en volg chill-outs voor alle studenten op een eenvoudige en efficiënte manier
          </p>
        </div>

        {/* Estadísticas rápidas - Diseño único */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-16 max-w-7xl mx-auto">
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all"></div>
            <div className="relative glass-effect rounded-2xl p-6 border border-white/20 hover:border-white/30 transition-all hover:scale-105">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shadow-lg shadow-white/20">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs font-semibold text-white/80 mb-1 uppercase tracking-wider">Studenten</p>
                <p className="text-3xl font-black text-white mb-1">{mounted ? totalStudents : '...'}</p>
                <p className="text-xs text-white/80 font-medium">{mounted ? `${activeStudents} actief` : ''}</p>
              </div>
            </div>
          </div>
          
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all"></div>
            <div className="relative glass-effect rounded-2xl p-6 border border-white/20 hover:border-white/30 transition-all hover:scale-105">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shadow-lg shadow-white/20">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs font-semibold text-white/80 mb-1 uppercase tracking-wider">Dagen</p>
                <p className="text-3xl font-black text-white mb-1">{mounted ? totalDays : '...'}</p>
                <p className="text-xs text-white/80 font-medium">geregistreerd</p>
              </div>
            </div>
          </div>
          
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all"></div>
            <div className="relative glass-effect rounded-2xl p-6 border border-white/20 hover:border-white/30 transition-all hover:scale-105">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shadow-lg shadow-white/20">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs font-semibold text-white/80 mb-1 uppercase tracking-wider">Totaal</p>
                <p className="text-3xl font-black text-white mb-1">{mounted ? totalChillOuts : '...'}</p>
                <p className="text-xs text-white/90 font-medium">chill-outs</p>
              </div>
            </div>
          </div>
          
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all"></div>
            <div className="relative glass-effect rounded-2xl p-6 border border-white/20 hover:border-white/30 transition-all hover:scale-105">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shadow-lg shadow-white/20">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs font-semibold text-white/80 mb-1 uppercase tracking-wider">Vandaag</p>
                <p className="text-3xl font-black text-white mb-1">{mounted ? todayChillOuts : '...'}</p>
                <p className="text-xs text-white/80 font-medium">chill-outs</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Navigation Cards - Diseño único con glassmorphism */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Beheer Studenten - Solo si tiene permiso students */}
            {user && hasPermission(user, 'students') && (
              <Link
                href="/students"
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
                  Beheer Studenten
                </h2>
                <p className="text-white/90 text-sm leading-relaxed">
                  Wijzig studenten hier. De dagelijkse bladen worden automatisch bijgewerkt.
                </p>
              </div>
            </Link>
            )}

            {/* Vandaag - Solo si tiene permiso dagelijks */}
            {user && hasPermission(user, 'dagelijks') && (
              <Link
                href={`/daily/${todayStr}`}
                className="group relative overflow-hidden"
              >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/10 rounded-3xl blur-2xl group-hover:blur-3xl transition-all"></div>
              <div className="relative glass-effect rounded-3xl p-8 border border-white/20 hover:border-white/30 transition-all hover:scale-[1.02] h-full">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center shadow-xl shadow-white/20 group-hover:scale-110 transition-transform">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                    <svg className="w-5 h-5 text-white group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-2xl font-black text-white mb-3 group-hover:text-white/80-100 transition-colors">
                  Vandaag ({dayName})
                </h2>
                <p className="text-white/90 text-sm leading-relaxed">
                  Registreer chill-outs voor vandaag snel en eenvoudig.
                </p>
              </div>
            </Link>
            )}

            {/* Dagelijks Overzicht - Solo si tiene permiso dagelijks */}
            {user && hasPermission(user, 'dagelijks') && (
              <Link
                href="/daily"
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
                <h2 className="text-2xl font-black text-white mb-3 group-hover:text-white transition-colors">
                  Dagelijks Overzicht
                </h2>
                <p className="text-white/90 text-sm leading-relaxed">
                  Bekijk en bewerk registraties per dag met overzichtelijke tabellen.
                </p>
              </div>
            </Link>
            )}

            {/* Weekoverzicht - Solo si tiene permiso weekoverzicht */}
            {user && hasPermission(user, 'weekoverzicht') && (
              <Link
                href="/weekly"
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
                  Weekoverzicht
                </h2>
                <p className="text-white/90 text-sm leading-relaxed">
                  Bekijk totalen per week en klas met gedetailleerde statistieken.
                </p>
              </div>
            </Link>
            )}

            {/* Statistieken - Solo si tiene permiso statistieken */}
            {user && hasPermission(user, 'statistieken') && (
              <Link
                href="/stats"
                className="group relative overflow-hidden lg:col-span-2"
              >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/15 to-white/20 rounded-3xl blur-2xl group-hover:blur-3xl transition-all"></div>
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
                  Bekijk gedetailleerde statistieken en trends over alle chill-outs.
                </p>
              </div>
            </Link>
            )}

            {/* Rapporten - Solo si tiene permiso rapporten */}
            {user && hasPermission(user, 'rapporten') && (
              <Link
                href="/import"
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
                    Rapporten
                  </h2>
                  <p className="text-white/90 text-sm leading-relaxed">
                    Bekijk gedetailleerde rapporten en analyses van alle chill-outs.
                  </p>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

