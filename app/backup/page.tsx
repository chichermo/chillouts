'use client';

import { useEffect, useMemo, useState } from 'react';
import Navigation from '@/components/Navigation';
import ChilloutStackedBarChart from '@/components/charts/ChilloutStackedBarChart';
import StickyTableWrap from '@/components/StickyTableWrap';
import { getCurrentUser, isAdmin } from '@/lib/auth';
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
  loadTimetables,
} from '@/lib/timetables';
import {
  archiveAndPurgeSchoolYear,
  getSchoolYearArchive,
  listArchivedSchoolYears,
  listYearsReadyToArchive,
  type SchoolYearArchive,
} from '@/lib/year-archive';
import type { DailyRecord, Student, Timetable } from '@/types';

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

const COLORS = { vr: '#3b82f6', vl: '#10b981', generic: '#fca5a5' };

function emptyCount(): CountRow {
  return { total: 0, vr: 0, vl: 0, generic: 0 };
}

function addType(row: CountRow, type: string | null) {
  row.total += 1;
  if (type === 'VR') row.vr += 1;
  else if (type === 'VL') row.vl += 1;
  else row.generic += 1;
}

function sortByTotalDesc<T extends { total: number }>(
  rows: T[],
  tieBreak: (a: T, b: T) => number
): T[] {
  return [...rows].sort((a, b) => b.total - a.total || tieBreak(a, b));
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

      forEachHourInStudentEntries(studentEntries, (hour) => {
        const slot = getHourSlot(studentEntries, hour);
        forEachChillOutAtHour(slot, (type) => {
          addType(dayRow, type);
          totalChillOuts += 1;
          if (type === 'VR') totalVR += 1;
          else if (type === 'VL') totalVL += 1;
          else totalGeneric += 1;

          if (!byHour[hour]) byHour[hour] = emptyCount();
          addType(byHour[hour], type);

          if (!byKlas[klas]) byKlas[klas] = emptyCount();
          addType(byKlas[klas], type);

          if (!byStudent[studentId]) {
            byStudent[studentId] = { ...emptyCount(), name, klas };
          }
          addType(byStudent[studentId], type);

          const teacher =
            timetable && recordDate
              ? getTeacherForSlot(timetable.slots, recordDate, hour) || '(Onbekend)'
              : '(Onbekend)';
          if (teacher === '(Onbekend)') teachersWithoutRoster += 1;
          if (!byTeacher[teacher]) byTeacher[teacher] = emptyCount();
          addType(byTeacher[teacher], type);
        });
      });
    }

    if (dayRow.total > 0) {
      daysWithData += 1;
      byDay.push({ date, ...dayRow });
    }
  }

  byDay.sort((a, b) => b.total - a.total || a.date.localeCompare(b.date));

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
    byDay,
  };
}

type YearMeta = {
  year: string;
  source: 'archive' | 'live';
  students_count?: number;
  records_count?: number;
  chillouts_total?: number;
  archived_at?: string;
};

export default function BackupPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [availableYears, setAvailableYears] = useState<YearMeta[]>([]);
  const [readyYears, setReadyYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [archive, setArchive] = useState<SchoolYearArchive | null>(null);
  const [timetableByKlas, setTimetableByKlas] = useState<Record<string, Timetable>>({});
  const [archiving, setArchiving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const admin = isAdmin();

  const reload = async () => {
    setLoading(true);
    setError('');
    try {
      const [archived, ready] = await Promise.all([
        listArchivedSchoolYears(),
        listYearsReadyToArchive().catch(() => [] as string[]),
      ]);
      const years: YearMeta[] = archived.map((a) => ({
        year: a.year,
        source: 'archive' as const,
        students_count: a.students_count,
        records_count: a.records_count,
        chillouts_total: a.chillouts_total,
        archived_at: a.archived_at,
      }));
      setAvailableYears(years);
      setReadyYears(ready);
      setSelectedYear((prev) => prev || years[0]?.year || '');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Laden mislukt');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    reload();
  }, []);

  useEffect(() => {
    if (!selectedYear) {
      setArchive(null);
      setTimetableByKlas({});
      return;
    }
    let cancelled = false;
    (async () => {
      const snap = await getSchoolYearArchive(selectedYear);
      if (cancelled) return;
      setArchive(snap);
      const timetables =
        snap?.timetables?.length
          ? snap.timetables
          : await loadTimetables(selectedYear).catch(() => [] as Timetable[]);
      if (!cancelled) setTimetableByKlas(indexTimetablesByKlas(timetables));
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedYear]);

  const students = (archive?.students || []) as Student[];
  const dailyRecords = (archive?.daily_records || {}) as Record<string, DailyRecord>;

  const stats = useMemo(() => {
    if (!selectedYear || !archive) return EMPTY_STATS;
    return buildStatsForYear(selectedYear, students, dailyRecords, timetableByKlas);
  }, [selectedYear, archive, students, dailyRecords, timetableByKlas]);

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
        Object.entries(stats.byTeacher).map(([teacher, counts]) => ({ teacher, ...counts })),
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

  const handleArchive = async (year: string) => {
    if (!admin) return;
    const ok = confirm(
      `Schooljaar ${year} archiveren en actieve app opschonen?\n\n` +
        `• Data wordt veilig opgeslagen in Backup\n` +
        `• Daily records van dit jaar verdwijnen uit de actieve app\n` +
        `• Studentenlijst wordt leeggemaakt (zit in het archief)\n` +
        `• Gebruikers blijven behouden\n\n` +
        `Dit kan niet ongedaan worden gemaakt.`
    );
    if (!ok) return;

    try {
      setArchiving(true);
      setError('');
      setMessage('');
      const user = getCurrentUser();
      const result = await archiveAndPurgeSchoolYear(year, {
        archivedBy: user?.username || 'admin',
      });
      setMessage(
        `Schooljaar ${result.year} gearchiveerd: ${result.chilloutsTotal} chill-outs, ` +
          `${result.recordsCount} dagen, ${result.studentsCount} studenten. App is klaar voor het nieuwe jaar.`
      );
      await reload();
      setSelectedYear(year);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Archiveren mislukt');
    } finally {
      setArchiving(false);
    }
  };

  if (!mounted) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <Navigation />
        <div className="flex min-h-screen items-center justify-center text-white">Laden…</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute right-10 top-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-20 left-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      </div>
      <Navigation />
      <div className="container relative z-10 mx-auto px-4 py-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="mb-2 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-3xl font-bold text-transparent">
              Backup — schooljaren
            </h1>
            <p className="text-sm text-white/80">
              Gearchiveerde schooljaren (alleen lezen). Huidig schooljaar:{' '}
              <strong>{getSchoolYear(new Date())}</strong>
            </p>
          </div>
          {availableYears.length > 0 && (
            <label className="flex flex-col gap-1 text-sm text-white/80">
              Schooljaar
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="min-w-[160px] rounded border border-white/20 bg-white/10 px-3 py-2 text-white"
              >
                {availableYears.map((y) => (
                  <option key={y.year} value={y.year} className="bg-[#2a2a3a]">
                    {y.year} (archief)
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {admin && readyYears.length > 0 && (
          <div className="mb-6 rounded-2xl border border-[#ACE1AF]/35 bg-[#ACE1AF]/10 px-4 py-4">
            <h2 className="text-sm font-bold text-[#ACE1AF]">Nieuw schooljaar voorbereiden</h2>
            <p className="mt-1 text-sm text-white/70">
              Deze schooljaren zijn afgelopen en kunnen naar Backup. Daarna is de actieve app
              leeg voor nieuwe data.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {readyYears.map((year) => (
                <button
                  key={year}
                  type="button"
                  disabled={archiving}
                  onClick={() => handleArchive(year)}
                  className="rounded-xl bg-[#ACE1AF] px-4 py-2 text-sm font-semibold text-[#141427] hover:bg-[#9dd6a1] disabled:opacity-60"
                >
                  {archiving ? 'Archiveren…' : `Archiveer ${year}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {message && (
          <div className="mb-4 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-50">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-xl border border-red-400/40 bg-red-500/15 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        <div className="mb-6 rounded-lg border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-50">
          <strong>Alleen lezen.</strong> Gearchiveerde gegevens kun je hier raadplegen, niet
          wijzigen.
          {range && (
            <>
              {' '}
              Periode: <strong>{range.from}</strong> t/m <strong>{range.to}</strong>.
            </>
          )}
          {archive?.archived_at && (
            <>
              {' '}
              Gearchiveerd op{' '}
              <strong>{new Date(archive.archived_at).toLocaleString('nl-NL')}</strong>
              {archive.students_count != null && (
                <>
                  {' '}
                  · {archive.students_count} studenten · {archive.records_count} dagen ·{' '}
                  {archive.chillouts_total} chill-outs
                </>
              )}
            </>
          )}
        </div>

        {loading ? (
          <div className="text-white">Laden…</div>
        ) : availableYears.length === 0 ? (
          <div className="glass-effect rounded-lg border border-white/20 p-8 text-white/80">
            Nog geen gearchiveerd schooljaar.
            {isSchoolYearCompleted(getSchoolYear(new Date()))
              ? ' Gebruik de knop hierboven om het afgelopen jaar te archiveren.'
              : ` Huidig schooljaar (${getSchoolYear(new Date())}) blijft actief tot na 30 juni.`}
          </div>
        ) : !archive ? (
          <div className="text-white/70">Archief laden…</div>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="glass-effect rounded-lg border-t-3 border-white/50 p-4 shadow-md">
                <p className="text-xs font-medium text-white/85">Totaal Chill-outs</p>
                <p className="text-2xl font-bold text-white">{stats.totalChillOuts}</p>
              </div>
              <div className="glass-effect rounded-lg border-t-3 p-4 shadow-md" style={{ borderTopColor: `${COLORS.vr}80` }}>
                <p className="text-xs font-medium text-white/85">Totaal VR</p>
                <p className="text-2xl font-bold text-blue-200">{stats.totalVR}</p>
              </div>
              <div className="glass-effect rounded-lg border-t-3 p-4 shadow-md" style={{ borderTopColor: `${COLORS.vl}80` }}>
                <p className="text-xs font-medium text-white/85">Totaal VL</p>
                <p className="text-2xl font-bold text-emerald-200">{stats.totalVL}</p>
              </div>
              <div className="glass-effect rounded-lg border-t-3 border-white/40 p-4 shadow-md">
                <p className="text-xs font-medium text-white/85">Dagen met data</p>
                <p className="text-2xl font-bold text-white">{stats.daysWithData}</p>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="glass-effect rounded-lg border border-white/20 p-4 shadow-md">
                <h2 className="mb-3 text-lg font-bold text-white">Chill-outs per Lesuur</h2>
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
              <div className="glass-effect rounded-lg border border-white/20 p-4 shadow-md">
                <h2 className="mb-3 text-lg font-bold text-white">Chill-outs per Klas</h2>
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
              <div className="glass-effect mb-4 rounded-lg border border-white/20 p-4 shadow-md">
                <h2 className="mb-1 text-lg font-bold text-white">Chill-outs per Docent</h2>
                <StickyTableWrap>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/20 bg-white/10">
                        <th className="px-3 py-2 text-left font-semibold text-white">#</th>
                        <th className="px-3 py-2 text-left font-semibold text-white">Docent</th>
                        <th className="px-3 py-2 text-center font-semibold text-white">Totaal</th>
                        <th className="px-3 py-2 text-center font-semibold text-white">VR</th>
                        <th className="px-3 py-2 text-center font-semibold text-white">VL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teachersSorted.map((t, index) => (
                        <tr key={t.teacher} className="border-b border-white/10 hover:bg-white/10">
                          <td className="px-3 py-2 text-xs text-white/50">{index + 1}</td>
                          <td className="px-3 py-2 font-medium text-white">{t.teacher}</td>
                          <td className="px-3 py-2 text-center font-semibold text-white">{t.total}</td>
                          <td className="px-3 py-2 text-center text-blue-200">{t.vr}</td>
                          <td className="px-3 py-2 text-center text-emerald-200">{t.vl}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </StickyTableWrap>
              </div>
            )}

            {studentsSorted.length > 0 && (
              <div className="glass-effect mb-4 rounded-lg border border-white/20 p-4 shadow-md">
                <h2 className="mb-1 text-lg font-bold text-white">Chill-outs per Student</h2>
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
                      </tr>
                    </thead>
                    <tbody>
                      {studentsSorted.map((student, index) => (
                        <tr key={student.id} className="border-b border-white/10 hover:bg-white/10">
                          <td className="px-3 py-2 text-xs text-white/50">{index + 1}</td>
                          <td className="px-3 py-2 font-medium text-white">{student.name}</td>
                          <td className="px-3 py-2">
                            <span className="rounded bg-white/20 px-2 py-0.5 text-xs text-white">
                              {student.klas}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center font-semibold text-white">
                            {student.total}
                          </td>
                          <td className="px-3 py-2 text-center text-blue-200">{student.vr}</td>
                          <td className="px-3 py-2 text-center text-emerald-200">{student.vl}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </StickyTableWrap>
              </div>
            )}

            {stats.byDay.length > 0 && (
              <div className="glass-effect rounded-lg border border-white/20 p-4 shadow-md">
                <h2 className="mb-1 text-lg font-bold text-white">Chill-outs per Dag</h2>
                <StickyTableWrap>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/20 bg-white/10">
                        <th className="px-3 py-2 text-left font-semibold text-white">#</th>
                        <th className="px-3 py-2 text-left font-semibold text-white">Datum</th>
                        <th className="px-3 py-2 text-center font-semibold text-white">Totaal</th>
                        <th className="px-3 py-2 text-center font-semibold text-white">VR</th>
                        <th className="px-3 py-2 text-center font-semibold text-white">VL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.byDay.map((day, index) => (
                        <tr key={day.date} className="border-b border-white/10 hover:bg-white/10">
                          <td className="px-3 py-2 text-xs text-white/50">{index + 1}</td>
                          <td className="px-3 py-2 text-white">
                            {formatDateDisplay(new Date(`${day.date}T12:00:00`))}
                          </td>
                          <td className="px-3 py-2 text-center font-semibold text-white">
                            {day.total}
                          </td>
                          <td className="px-3 py-2 text-center text-blue-200">{day.vr}</td>
                          <td className="px-3 py-2 text-center text-emerald-200">{day.vl}</td>
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
