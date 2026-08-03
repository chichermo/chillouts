'use client';

import { useState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import ChilloutsBrand from '@/components/ChilloutsBrand';
import { loadData } from '@/lib/storage';
import { countChillOutsInRecord, formatDate, getDayName } from '@/lib/utils';
import { getCurrentUser, hasPermission, isAdmin } from '@/lib/auth';

function DashCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <Link href={href} className="group block">
      <div className="glass-effect h-full rounded-2xl border border-white/12 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/25 hover:shadow-[0_10px_28px_rgba(0,0,0,0.3)]">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ACE1AF]/15 ring-1 ring-[#ACE1AF]/25">
            {icon}
          </div>
          <svg
            className="h-4 w-4 text-white/35 transition-transform group-hover:translate-x-0.5 group-hover:text-white/70"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
        <h2 className="mb-1 text-base font-bold text-white">{title}</h2>
        <p className="text-xs leading-relaxed text-white/55">{description}</p>
      </div>
    </Link>
  );
}

const iconClass = 'h-5 w-5 text-[#ACE1AF]';

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

    const loadDataAsync = async () => {
      const data = await loadData();
      setTotalStudents(data.students.length);
      setActiveStudents(data.students.filter((s) => s.status === 'Actief').length);
      setTotalDays(Object.keys(data.dailyRecords).length);

      let total = 0;
      Object.values(data.dailyRecords).forEach((record) => {
        total += countChillOutsInRecord(record).total;
      });
      setTotalChillOuts(total);

      const todayStrFormatted = formatDate(new Date());
      const todayRecord = data.dailyRecords[todayStrFormatted];
      setTodayChillOuts(todayRecord ? countChillOutsInRecord(todayRecord).total : 0);
    };
    loadDataAsync();
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-10 top-20 h-72 w-72 rounded-full bg-brand-pink/20 blur-3xl" />
        <div className="absolute bottom-20 right-10 h-96 w-96 rounded-full bg-brand-green/20 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-orange/20 blur-3xl" />
      </div>

      <Navigation />
      <div className="container relative z-10 mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ChilloutsBrand size="md" />
              <span
                className="h-3 w-3 shrink-0 rounded-full bg-[#2563eb]"
                aria-hidden="true"
                title="Blauwe stip"
              />
            </div>
            <p className="mt-2 max-w-lg text-sm text-white/55">
              Beheer en volg chill-outs voor alle studenten
            </p>
          </div>
          <p className="text-xs font-medium uppercase tracking-wider text-white/35">
            {mounted ? `${dayName} · ${todayStr}` : '…'}
          </p>
        </div>

        <div className="mb-8 grid max-w-7xl grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {[
            {
              label: 'Studenten',
              value: mounted ? totalStudents : '…',
              sub: mounted ? `${activeStudents} actief` : '',
            },
            {
              label: 'Dagen',
              value: mounted ? totalDays : '…',
              sub: 'geregistreerd',
            },
            {
              label: 'Totaal',
              value: mounted ? totalChillOuts : '…',
              sub: 'chill-outs',
            },
            {
              label: 'Vandaag',
              value: mounted ? todayChillOuts : '…',
              sub: 'chill-outs',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="glass-effect rounded-2xl border border-white/15 p-4"
            >
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/55">
                {stat.label}
              </p>
              <p className="text-2xl font-black text-white">{stat.value}</p>
              <p className="text-xs text-white/50">{stat.sub}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {user && hasPermission(user, 'students') && (
            <DashCard
              href="/students"
              title="Beheer Studenten"
              description="Wijzig studenten — dagelijkse bladen worden automatisch bijgewerkt."
              icon={
                <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              }
            />
          )}
          {user && hasPermission(user, 'dagelijks') && (
            <DashCard
              href={`/daily/${todayStr}`}
              title={`Vandaag (${dayName})`}
              description="Registreer chill-outs voor vandaag snel en eenvoudig."
              icon={
                <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          )}
          {user && hasPermission(user, 'dagelijks') && (
            <DashCard
              href="/daily"
              title="Dagelijks overzicht"
              description="Bekijk en bewerk registraties per dag."
              icon={
                <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            />
          )}
          {user && hasPermission(user, 'weekoverzicht') && (
            <DashCard
              href="/weekly"
              title="Weekoverzicht"
              description="Bekijk totalen per week en klas."
              icon={
                <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
            />
          )}
          {user && hasPermission(user, 'statistieken') && (
            <DashCard
              href="/stats"
              title="Statistieken"
              description="Gedetailleerde statistieken en trends."
              icon={
                <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
            />
          )}
          {user && hasPermission(user, 'rapporten') && (
            <DashCard
              href="/import"
              title="Rapporten"
              description="Rapporten en analyses van chill-outs."
              icon={
                <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />
          )}
          {user && hasPermission(user, 'backup') && (
            <DashCard
              href="/backup"
              title="Backup"
              description="Archief van vorige schooljaren (sept–juni)."
              icon={
                <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              }
            />
          )}
          {user && isAdmin() && (
            <DashCard
              href="/timetables"
              title="Roosters"
              description="Koppel docenten aan klassen per dag en lesuur."
              icon={
                <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
