'use client';

import { useEffect, useMemo, useState } from 'react';
import Navigation from '@/components/Navigation';
import ChilloutStackedBarChart from '@/components/charts/ChilloutStackedBarChart';
import StickyTableWrap from '@/components/StickyTableWrap';
import { loadData } from '@/lib/storage';
import {
  forEachChillOutAtHour,
  forEachHourInStudentEntries,
  formatDateDisplay,
  getHourSlot,
  parseRecordDate,
} from '@/lib/utils';
import {
  findTimetableInMap,
  getSchoolYear,
  getSchoolYearDateRange,
  getTeacherForSlot,
  indexTimetablesByKlas,
  isSchoolYearCompleted,
  listSchoolYearsFromDates,
  loadTimetables,
} from '@/lib/timetables';
import type { Student, Timetable } from '@/types';

type CountRow = { total: number; vr: number; vl: number; generic: number };

type BackupStats = {
  totalChillOuts: number;
  totalVR: number;
  totalVL: number;
  totalGeneric: number;
  daysWithData: number;
  teachersWithoutRoster: number;
  byHour: Record<number, CountRow>;
  byKlas: Record<string, CountRow>;
  byStudent: Record<string, CountRow & { name: string; klas: string }>;
  byTeacher: Record<string, CountRow>;
  byDay: Array<CountRow & { date: string }>;
};

const EMPTY_STATS: BackupStats = {
  totalChillOuts: 0,
  totalVR: 0,
  totalVL: 0,
  totalGeneric: 0,
  daysWithData: 0,
  teachersWithoutRoster: 0,
  byHour: {},
  byKlas: {},
  byStudent: {},
  byTeacher: {},
  byDay: [],
};

const COLORS = {
  vr: '#3b82f6',
  vl: '#10b981',
  generic: '#fca5a5',
};

function emptyCount(): CountRow {
  return { total: 0, vr: 0, vl: 0, generic: 0 };
}

function addType(row: CountRow, type: string | null) {
  row.total += 1;
  if (type === 'VR') row.vr += 1;
  else if (type === 'VL') row.vl += 1;
  else row.generic += 1;
}

function buildStatsForYear(
  year: string,
  students: Student[],
  dailyRecords: Record<string, { entries: Record<string, unknown> }>,
  timetableByKlas: Record<string, Timetable>
): BackupStats {
  const range = getSchoolYearDateRange(year);
  if (!range) return EMPTY_STATS;

  const byHour: BackupStats['byHour'] = {};
  for (let hour = 1; hour <= 7; hour++) byHour[hour] = emptyCount();
  const byKlas: BackupStats['byKlas'] = {};
  const byStudent: BackupStats['byStudent'] = {};
  const byTeacher: BackupStats['byTeacher'] = {};
  const byDay: BackupStats['byDay'] = [];

  const studentById = new Map(students.map((s) => [s.id, s]));

  let totalChillOuts = 0;
  let totalVR = 0;
  let totalVL = 0;
  let totalGeneric = 0;
  let daysWithData = 0;
  let teachersWithoutRoster = 0;

  const dates = Object.keys(dailyRecords)
    .filter((date) => date >= range.from && date <= range.to)
    .sort();

  for (const date of dates) {
    const record = dailyRecords[date];
    if (!record) continue;

    const recordDate = parseRecordDate(date);
    const dayRow = emptyCount();

    for (const [studentId, entries] of Object.entries(record.entries || {})) {
      const studentEntries = entries as Record<string | number, unknown>;
      const student = studentById.get(studentId);
      const name = student?.name || studentId;
      const klas = student?.klas || '(Onbekend)';
      const timetable = findTimetableInMap(timetableByKlas, klas);

      forEachHourInStudentEntries(studentEntries, (hour, _slotArr) => {
        const slot = getHourSlot(studentEntries, hour);
        forEachChillOutAtHour(slot, (type) => {
          addType(dayRow, type);
          addType(byHour[hour], type);

          if (!byKlas[klas]) byKlas[klas] = emptyCount();
          addType(byKlas[klas], type);

          if (!byStudent[studentId]) {
            byStudent[studentId] = { name, klas, ...emptyCount() };
          }
          addType(byStudent[studentId], type);

          if (recordDate) {
            const teacher = timetable
              ? getTeacherForSlot(timetable.slots, recordDate, hour)
              : '';
            if (!teacher) teachersWithoutRoster += 1;
            const teacherKey = teacher || '(Onbekend)';
            if (!byTeacher[teacherKey]) byTeacher[teacherKey] = emptyCount();
            addType(byTeacher[teacherKey], type);
          }
        });
      });
    }

    if (dayRow.total > 0) {
      daysWithData += 1;
      totalChillOuts += dayRow.total;
      totalVR += dayRow.vr;
      totalVL += dayRow.vl;
      totalGeneric += dayRow.generic;
      byDay.push({ date, ...dayRow });
    }
  }

  return {
    totalChillOuts,
    totalVR,
    totalVL,
    totalGeneric,
    daysWithData,
    teachersWithoutRoster,
    byHour,
    byKlas,
    byStudent,
    byTeacher,
    byDay: byDay.sort((a, b) => b.total - a.total || b.date.localeCompare(a.date)),
  };
}

function sortByTotalDesc<T extends { total: number }>(
  items: T[],
  tieBreak?: (a: T, b: T) => number
): T[] {
  return [...items].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return tieBreak ? tieBreak(a, b) : 0;
  });
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
  const [timetableByKlas, setTimetableByKlas] = useState<Record<string, Timetable>>({});

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

  useEffect(() => {
    if (!selectedYear) {
      setTimetableByKlas({});
      return;
    }
    let cancelled = false;
    loadTimetables(selectedYear)
      .then((timetables) => {
        if (!cancelled) setTimetableByKlas(indexTimetablesByKlas(timetables));
      })
      .catch(() => {
        if (!cancelled) setTimetableByKlas({});
      });
    return () => {
      cancelled = true;
    };
  }, [selectedYear]);

  const stats = useMemo(() => {
    if (!selectedYear) return EMPTY_STATS;
    return buildStatsForYear(selectedYear, students, dailyRecords, timetableByKlas);
  }, [selectedYear, students, dailyRecords, timetableByKlas]);

  const range = useMemo(
    () => (selectedYear ? getSchoolYearDateRange(selectedYear) : null),
    [selectedYear]
  );

  const studentsSorted = useMemo(
    () =>
      sortByTotalDesc(
        Object.entries(stats.byStudent).map(([id, row]) => ({ id, ...row })),
        (a, b) => a.name.localeCompare(b.name)
      ),
    [stats.byStudent]
  );

  const teachersSorted = useMemo(
    () =>
      sortByTotalDesc(
        Object.entries(stats.byTeacher).map(([teacher, counts]) => ({
          teacher,
          ...counts,
        })),
        (a, b) => a.teacher.localeCompare(b.teacher)
      ),
    [stats.byTeacher]
  );

  const klassenSorted = useMemo(
    () =>
      sortByTotalDesc(
        Object.entries(stats.byKlas).map(([klas, counts]) => ({ klas, ...counts })),
        (a, b) => a.klas.localeCompare(b.klas)
      ),
    [stats.byKlas]
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
                    const h = stats.byHour[hour] || emptyCount();
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
                  data={klassenSorted.map((k) => ({
                    label: k.klas,
                    vr: k.vr,
                    vl: k.vl,
                    generic: k.generic,
                  }))}
                  layout="horizontal"
                  height={Math.max(280, klassenSorted.length * 36)}
                  ariaLabel="Backup chill-outs per klas"
                />
              </div>
            </div>

            {teachersSorted.length > 0 && (
              <div className="glass-effect rounded-lg shadow-md p-4 mb-4 border border-white/20">
                <h2 className="text-lg font-bold mb-1 text-white">Chill-outs per Docent</h2>
                <p className="text-white/70 text-sm mb-4">
                  Gekoppeld via roosters van schooljaar {selectedYear}. Gesorteerd van hoog
                  naar laag.
                </p>
                {stats.teachersWithoutRoster > 0 &&
                  teachersSorted.length === 1 &&
                  teachersSorted[0]?.teacher === '(Onbekend)' && (
                    <p className="text-amber-200/90 text-sm mb-4 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2">
                      Geen docent gevonden voor {stats.teachersWithoutRoster} chill-out
                      {stats.teachersWithoutRoster === 1 ? '' : 's'} — roosters voor dit
                      schooljaar waren leeg of onvolledig.
                    </p>
                  )}
                <StickyTableWrap>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/20 bg-white/10">
                        <th className="px-3 py-2 text-left font-semibold text-white">#</th>
                        <th className="px-3 py-2 text-left font-semibold text-white">Docent</th>
                        <th className="px-3 py-2 text-center font-semibold text-white">Totaal</th>
                        <th className="px-3 py-2 text-center font-semibold text-white">VR</th>
                        <th className="px-3 py-2 text-center font-semibold text-white">VL</th>
                        <th className="px-3 py-2 text-center font-semibold text-white">
                          Chill-outs
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {teachersSorted.map((t, index) => (
                        <tr
                          key={t.teacher}
                          className="border-b border-white/10 hover:bg-white/10 transition-colors"
                        >
                          <td className="px-3 py-2 text-white/50 text-xs">{index + 1}</td>
                          <td className="px-3 py-2 font-medium text-white">{t.teacher}</td>
                          <td className="px-3 py-2 text-center font-semibold text-white">
                            {t.total}
                          </td>
                          <td className="px-3 py-2 text-center text-blue-200">{t.vr}</td>
                          <td className="px-3 py-2 text-center text-emerald-200">{t.vl}</td>
                          <td
                            className="px-3 py-2 text-center font-medium"
                            style={{ color: COLORS.generic }}
                          >
                            {t.generic}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </StickyTableWrap>
              </div>
            )}

            {studentsSorted.length > 0 && (
              <div className="glass-effect rounded-lg shadow-md p-4 mb-4 border border-white/20">
                <h2 className="text-lg font-bold mb-1 text-white">Chill-outs per Student</h2>
                <p className="text-white/70 text-sm mb-4">
                  Gesorteerd van hoog naar laag (meeste chill-outs eerst).
                </p>
                <StickyTableWrap>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/20 bg-white/10">
                        <th className="px-3 py-2 text-left font-semibold text-white">#</th>
                        <th className="px-3 py-2 text-left font-semibold text-white">Naam</th>
                        <th className="px-3 py-2 text-left font-semibold text-white">Klas</th>
                        <th className="px-3 py-2 text-center font-semibold text-white">Totaal</th>
                        <th className="px-3 py-2 text-center font-semibold text-white">VR</th>
                        <th className="px-3 py-2 text-center font-semibold text-white">VL</th>
                        <th className="px-3 py-2 text-center font-semibold text-white">
                          Chill-outs
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentsSorted.map((student, index) => (
                        <tr
                          key={student.id}
                          className="border-b border-white/10 hover:bg-white/10 transition-colors"
                        >
                          <td className="px-3 py-2 text-white/50 text-xs">{index + 1}</td>
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
                      ))}
                    </tbody>
                  </table>
                </StickyTableWrap>
              </div>
            )}

            {stats.byDay.length > 0 && (
              <div className="glass-effect rounded-lg shadow-md p-4 border border-white/20">
                <h2 className="text-lg font-bold mb-1 text-white">Chill-outs per Dag</h2>
                <p className="text-white/70 text-sm mb-4">
                  Gesorteerd van hoog naar laag.
                </p>
                <StickyTableWrap>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/20 bg-white/10">
                        <th className="px-3 py-2 text-left font-semibold text-white">#</th>
                        <th className="px-3 py-2 text-left font-semibold text-white">Datum</th>
                        <th className="px-3 py-2 text-center font-semibold text-white">Totaal</th>
                        <th className="px-3 py-2 text-center font-semibold text-white">VR</th>
                        <th className="px-3 py-2 text-center font-semibold text-white">VL</th>
                        <th className="px-3 py-2 text-center font-semibold text-white">
                          Chill-outs
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.byDay.map((day, index) => (
                        <tr
                          key={day.date}
                          className="border-b border-white/10 hover:bg-white/10 transition-colors"
                        >
                          <td className="px-3 py-2 text-white/50 text-xs">{index + 1}</td>
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
          </>
        )}
      </div>
    </div>
  );
}
