'use client';

import { useEffect, useMemo, useState } from 'react';
import Navigation from '@/components/Navigation';
import ChilloutStackedBarChart from '@/components/charts/ChilloutStackedBarChart';
import StickyTableWrap from '@/components/StickyTableWrap';
import { loadData } from '@/lib/storage';
import {
  countChillOutsInStudentEntries,
  formatDateDisplay,
} from '@/lib/utils';
import {
  getSchoolYear,
  getSchoolYearDateRange,
  isSchoolYearCompleted,
  listSchoolYearsFromDates,
} from '@/lib/timetables';
import type { Student } from '@/types';

type BackupStats = {
  totalChillOuts: number;
  totalVR: number;
  totalVL: number;
  totalGeneric: number;
  daysWithData: number;
  byHour: Record<number, { total: number; vr: number; vl: number; generic: number }>;
  byKlas: Record<string, { total: number; vr: number; vl: number; generic: number }>;
  byStudent: Record<
    string,
    { name: string; klas: string; total: number; vr: number; vl: number; generic: number }
  >;
  byDay: { date: string; total: number; vr: number; vl: number; generic: number }[];
};

const EMPTY_STATS: BackupStats = {
  totalChillOuts: 0,
  totalVR: 0,
  totalVL: 0,
  totalGeneric: 0,
  daysWithData: 0,
  byHour: {},
  byKlas: {},
  byStudent: {},
  byDay: [],
};

const COLORS = {
  vr: '#3b82f6',
  vl: '#10b981',
  generic: '#fca5a5',
};

function buildStatsForYear(
  year: string,
  students: Student[],
  dailyRecords: Record<string, { entries: Record<string, unknown> }>
): BackupStats {
  const range = getSchoolYearDateRange(year);
  if (!range) return EMPTY_STATS;

  const byHour: BackupStats['byHour'] = {};
  for (let hour = 1; hour <= 7; hour++) {
    byHour[hour] = { total: 0, vr: 0, vl: 0, generic: 0 };
  }
  const byKlas: BackupStats['byKlas'] = {};
  const byStudent: BackupStats['byStudent'] = {};
  const byDay: BackupStats['byDay'] = [];

  const studentById = new Map(students.map((s) => [s.id, s]));

  let totalChillOuts = 0;
  let totalVR = 0;
  let totalVL = 0;
  let totalGeneric = 0;
  let daysWithData = 0;

  const dates = Object.keys(dailyRecords)
    .filter((date) => date >= range.from && date <= range.to)
    .sort();

  for (const date of dates) {
    const record = dailyRecords[date];
    if (!record) continue;

    let dayTotal = 0;
    let dayVR = 0;
    let dayVL = 0;
    let dayGeneric = 0;
    const hourDay: Record<number, { total: number; vr: number; vl: number; generic: number }> = {};
    for (let hour = 1; hour <= 7; hour++) {
      hourDay[hour] = { total: 0, vr: 0, vl: 0, generic: 0 };
    }

    for (const [studentId, entries] of Object.entries(record.entries || {})) {
      const dayCounts = countChillOutsInStudentEntries(
        entries as Record<string | number, unknown> | undefined
      );
      if (dayCounts.total === 0) continue;

      const student = studentById.get(studentId);
      const name = student?.name || studentId;
      const klas = student?.klas || '(Onbekend)';

      dayTotal += dayCounts.total;
      dayVR += dayCounts.vr;
      dayVL += dayCounts.vl;
      dayGeneric += dayCounts.generic;

      if (!byKlas[klas]) byKlas[klas] = { total: 0, vr: 0, vl: 0, generic: 0 };
      byKlas[klas].total += dayCounts.total;
      byKlas[klas].vr += dayCounts.vr;
      byKlas[klas].vl += dayCounts.vl;
      byKlas[klas].generic += dayCounts.generic;

      if (!byStudent[studentId]) {
        byStudent[studentId] = { name, klas, total: 0, vr: 0, vl: 0, generic: 0 };
      }
      byStudent[studentId].total += dayCounts.total;
      byStudent[studentId].vr += dayCounts.vr;
      byStudent[studentId].vl += dayCounts.vl;
      byStudent[studentId].generic += dayCounts.generic;

      // Per lesuur: herbereken vanuit slots
      const studentEntries = entries as Record<string | number, unknown>;
      for (let hour = 1; hour <= 7; hour++) {
        const hourCounts = countChillOutsInStudentEntries({
          [hour]: studentEntries[hour] ?? studentEntries[String(hour)],
        });
        hourDay[hour].total += hourCounts.total;
        hourDay[hour].vr += hourCounts.vr;
        hourDay[hour].vl += hourCounts.vl;
        hourDay[hour].generic += hourCounts.generic;
      }
    }

    if (dayTotal > 0) daysWithData += 1;
    totalChillOuts += dayTotal;
    totalVR += dayVR;
    totalVL += dayVL;
    totalGeneric += dayGeneric;

    byDay.push({
      date,
      total: dayTotal,
      vr: dayVR,
      vl: dayVL,
      generic: dayGeneric,
    });

    for (let hour = 1; hour <= 7; hour++) {
      byHour[hour].total += hourDay[hour].total;
      byHour[hour].vr += hourDay[hour].vr;
      byHour[hour].vl += hourDay[hour].vl;
      byHour[hour].generic += hourDay[hour].generic;
    }
  }

  return {
    totalChillOuts,
    totalVR,
    totalVL,
    totalGeneric,
    daysWithData,
    byHour,
    byKlas,
    byStudent,
    byDay: byDay.sort((a, b) => b.date.localeCompare(a.date)),
  };
}

export default function BackupPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [dailyRecords, setDailyRecords] = useState<
    Record<string, { entries: Record<string, unknown> }>
  >({});

  useEffect(() => {
    setMounted(true);
    const load = async () => {
      setLoading(true);
      try {
        const data = await loadData();
        const allDates = Object.keys(data.dailyRecords || {});
        const years = listSchoolYearsFromDates(allDates).filter((year) =>
          isSchoolYearCompleted(year)
        );
        setStudents(data.students);
        setDailyRecords(data.dailyRecords);
        setAvailableYears(years);
        setSelectedYear((prev) => prev || years[0] || '');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const stats = useMemo(() => {
    if (!selectedYear) return EMPTY_STATS;
    return buildStatsForYear(selectedYear, students, dailyRecords);
  }, [selectedYear, students, dailyRecords]);

  const range = useMemo(
    () => (selectedYear ? getSchoolYearDateRange(selectedYear) : null),
    [selectedYear]
  );

  if (!mounted) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <Navigation />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-xl text-white">Laden...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
      </div>
      <Navigation />
      <div className="container mx-auto px-4 py-6 relative z-10">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
              Backup — vorige schooljaren
            </h1>
            <p className="text-sm text-white/90">
              Alleen-lezen overzicht van afgesloten schooljaren (september–juni). Geen
              bewerken of wijzigen.
            </p>
          </div>
          {availableYears.length > 0 && (
            <label className="flex flex-col gap-1 text-sm text-white/80">
              Schooljaar
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-2 rounded bg-white/10 text-white border border-white/20 min-w-[160px]"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year} className="bg-[#2a2a3a]">
                    {year}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="mb-6 rounded-lg border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-50">
          <strong>Alleen lezen.</strong> Dit is een archiefweergave. Gegevens uit Dagelijks
          van dit schooljaar kun je hier niet wijzigen.
          {range && (
            <>
              {' '}
              Periode: <strong>{range.from}</strong> t/m <strong>{range.to}</strong>.
            </>
          )}
        </div>

        {loading ? (
          <div className="text-white">Laden...</div>
        ) : availableYears.length === 0 ? (
          <div className="glass-effect rounded-lg p-8 border border-white/20 text-white/80">
            Nog geen afgesloten schooljaar met data. Een schooljaar verschijnt hier na{' '}
            <strong>30 juni</strong> (einde schooljaar). Huidig schooljaar (
            {getSchoolYear(new Date())}) blijft beschikbaar via Dagelijks / Rapporten.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="glass-effect rounded-lg shadow-md p-4 border-t-3 border-white/50">
                <p className="text-xs font-medium text-white/85">Totaal Chill-outs</p>
                <p className="text-2xl font-bold text-white">{stats.totalChillOuts}</p>
              </div>
              <div
                className="glass-effect rounded-lg shadow-md p-4 border-t-3"
                style={{ borderTopColor: `${COLORS.vr}80` }}
              >
                <p className="text-xs font-medium text-white/85">Totaal VR</p>
                <p className="text-2xl font-bold text-blue-200">{stats.totalVR}</p>
              </div>
              <div
                className="glass-effect rounded-lg shadow-md p-4 border-t-3"
                style={{ borderTopColor: `${COLORS.vl}80` }}
              >
                <p className="text-xs font-medium text-white/85">Totaal VL</p>
                <p className="text-2xl font-bold text-emerald-200">{stats.totalVL}</p>
              </div>
              <div className="glass-effect rounded-lg shadow-md p-4 border-t-3 border-white/40">
                <p className="text-xs font-medium text-white/85">Dagen met data</p>
                <p className="text-2xl font-bold text-white">{stats.daysWithData}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <div className="glass-effect rounded-lg shadow-md p-4 border border-white/20">
                <h2 className="text-lg font-bold mb-3 text-white">Chill-outs per Lesuur</h2>
                <ChilloutStackedBarChart
                  data={[1, 2, 3, 4, 5, 6, 7].map((hour) => {
                    const h = stats.byHour[hour] || { total: 0, vr: 0, vl: 0, generic: 0 };
                    return { label: `L${hour}`, vr: h.vr, vl: h.vl, generic: h.generic };
                  })}
                  layout="vertical"
                  height={300}
                  ariaLabel="Backup chill-outs per lesuur"
                />
              </div>
              <div className="glass-effect rounded-lg shadow-md p-4 border border-white/20">
                <h2 className="text-lg font-bold mb-3 text-white">Chill-outs per Klas</h2>
                <ChilloutStackedBarChart
                  data={Object.keys(stats.byKlas)
                    .sort((a, b) => stats.byKlas[b].total - stats.byKlas[a].total)
                    .map((klas) => {
                      const k = stats.byKlas[klas];
                      return { label: klas, vr: k.vr, vl: k.vl, generic: k.generic };
                    })}
                  layout="horizontal"
                  height={Math.max(280, Object.keys(stats.byKlas).length * 36)}
                  ariaLabel="Backup chill-outs per klas"
                />
              </div>
            </div>

            {stats.byDay.length > 0 && (
              <div className="glass-effect rounded-lg shadow-md p-4 mb-4 border border-white/20">
                <h2 className="text-lg font-bold mb-3 text-white">Per dag (archief)</h2>
                <StickyTableWrap>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/20 bg-white/10">
                        <th className="px-3 py-2 text-left font-semibold text-white">Datum</th>
                        <th className="px-3 py-2 text-center font-semibold text-white">Totaal</th>
                        <th className="px-3 py-2 text-center font-semibold text-white">VR</th>
                        <th className="px-3 py-2 text-center font-semibold text-white">VL</th>
                        <th className="px-3 py-2 text-center font-semibold text-white">Chill-outs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.byDay.map((day) => (
                        <tr
                          key={day.date}
                          className="border-b border-white/10 hover:bg-white/10 transition-colors"
                        >
                          <td className="px-3 py-2 text-white">
                            {formatDateDisplay(new Date(`${day.date}T12:00:00`))}
                          </td>
                          <td className="px-3 py-2 text-center font-semibold text-white">
                            {day.total}
                          </td>
                          <td className="px-3 py-2 text-center text-blue-200">{day.vr}</td>
                          <td className="px-3 py-2 text-center text-emerald-200">{day.vl}</td>
                          <td
                            className="px-3 py-2 text-center font-medium"
                            style={{ color: COLORS.generic }}
                          >
                            {day.generic}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </StickyTableWrap>
              </div>
            )}

            {Object.keys(stats.byStudent).length > 0 && (
              <div className="glass-effect rounded-lg shadow-md p-4 border border-white/20">
                <h2 className="text-lg font-bold mb-3 text-white">Per student (archief)</h2>
                <StickyTableWrap>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/20 bg-white/10">
                        <th className="px-3 py-2 text-left font-semibold text-white">Naam</th>
                        <th className="px-3 py-2 text-left font-semibold text-white">Klas</th>
                        <th className="px-3 py-2 text-center font-semibold text-white">Totaal</th>
                        <th className="px-3 py-2 text-center font-semibold text-white">VR</th>
                        <th className="px-3 py-2 text-center font-semibold text-white">VL</th>
                        <th className="px-3 py-2 text-center font-semibold text-white">Chill-outs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(stats.byStudent)
                        .sort((a, b) => {
                          const sa = stats.byStudent[a];
                          const sb = stats.byStudent[b];
                          if (sa.klas !== sb.klas) return sa.klas.localeCompare(sb.klas);
                          return sa.name.localeCompare(sb.name);
                        })
                        .map((studentId) => {
                          const student = stats.byStudent[studentId];
                          return (
                            <tr
                              key={studentId}
                              className="border-b border-white/10 hover:bg-white/10 transition-colors"
                            >
                              <td className="px-3 py-2 font-medium text-white">{student.name}</td>
                              <td className="px-3 py-2">
                                <span className="px-2 py-0.5 bg-white/20 rounded text-xs text-white">
                                  {student.klas}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center font-semibold text-white">
                                {student.total}
                              </td>
                              <td className="px-3 py-2 text-center text-blue-200">{student.vr}</td>
                              <td className="px-3 py-2 text-center text-emerald-200">
                                {student.vl}
                              </td>
                              <td
                                className="px-3 py-2 text-center font-medium"
                                style={{ color: COLORS.generic }}
                              >
                                {student.generic}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </StickyTableWrap>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
