'use client';

import { useMemo, useState, type ReactNode } from 'react';
import StickyTableWrap from '@/components/StickyTableWrap';
import { formatDateDisplay } from '@/lib/utils';
import {
  getArchivedDayDetail,
  getArchivedStudentTimeline,
  queryArchivedDays,
  queryArchivedStudents,
  type SchoolYearArchive,
} from '@/lib/year-archive';

type Tab = 'stats' | 'students' | 'days';

type Props = {
  archive: SchoolYearArchive;
  statsPanel: ReactNode;
};

export default function ArchiveBrowse({ archive, statsPanel }: Props) {
  const [tab, setTab] = useState<Tab>('stats');
  const [studentQuery, setStudentQuery] = useState('');
  const [klasFilter, setKlasFilter] = useState('');
  const [dayQuery, setDayQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const klassen = useMemo(() => {
    const set = new Set((archive.students || []).map((s) => s.klas));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'nl'));
  }, [archive.students]);

  const students = useMemo(
    () => queryArchivedStudents(archive, { query: studentQuery, klas: klasFilter || undefined }),
    [archive, studentQuery, klasFilter]
  );

  const days = useMemo(
    () => queryArchivedDays(archive, { query: dayQuery }),
    [archive, dayQuery]
  );

  const studentTimeline = useMemo(
    () => (selectedStudentId ? getArchivedStudentTimeline(archive, selectedStudentId) : []),
    [archive, selectedStudentId]
  );

  const dayDetail = useMemo(
    () => (selectedDate ? getArchivedDayDetail(archive, selectedDate) : null),
    [archive, selectedDate]
  );

  const selectedStudent = (archive.students || []).find((s) => s.id === selectedStudentId);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'stats', label: 'Statistieken' },
    { id: 'students', label: `Studenten (${archive.students_count})` },
    { id: 'days', label: `Daily records (${archive.records_count})` },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setSelectedStudentId(null);
              setSelectedDate(null);
            }}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === t.id
                ? 'bg-[#E85A5A]/20 text-[#E85A5A]'
                : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/50">
        Alleen raadplegen — gearchiveerde studenten en daily records zijn vastgezet en niet
        bewerkbaar.
      </div>

      {tab === 'stats' && statsPanel}

      {tab === 'students' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              value={studentQuery}
              onChange={(e) => setStudentQuery(e.target.value)}
              placeholder="Zoek op naam of klas…"
              className="min-w-[200px] flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#E85A5A]/40"
            />
            <select
              value={klasFilter}
              onChange={(e) => setKlasFilter(e.target.value)}
              className="rounded-xl border border-white/15 bg-[#2a2a3a] px-3 py-2 text-sm text-white"
            >
              <option value="">Alle klassen</option>
              {klassen.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          <div className="glass-effect rounded-xl border border-white/12 overflow-hidden">
            <StickyTableWrap>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/15 bg-white/10">
                    <th className="px-3 py-2 text-left text-white">Naam</th>
                    <th className="px-3 py-2 text-left text-white">Klas</th>
                    <th className="px-3 py-2 text-center text-white">Dagen</th>
                    <th className="px-3 py-2 text-center text-white">Chill-outs</th>
                    <th className="px-3 py-2 text-right text-white"> </th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id} className="border-b border-white/8 hover:bg-white/[0.04]">
                      <td className="px-3 py-2 font-medium text-white">{s.name}</td>
                      <td className="px-3 py-2 text-white/80">{s.klas}</td>
                      <td className="px-3 py-2 text-center text-white/70">{s.daysWithChillouts}</td>
                      <td className="px-3 py-2 text-center font-semibold text-white">
                        {s.chilloutsTotal}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedStudentId(s.id)}
                          className="rounded-lg px-2 py-1 text-xs text-[#E85A5A] hover:bg-[#E85A5A]/15"
                        >
                          Bekijken
                        </button>
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-white/50">
                        Geen studenten gevonden in dit archief.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </StickyTableWrap>
          </div>

          {selectedStudent && (
            <div className="glass-effect rounded-xl border border-[#E85A5A]/25 p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedStudent.name}</h3>
                  <p className="text-sm text-white/55">
                    {selectedStudent.klas} · alleen-lezen tijdlijn
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStudentId(null)}
                  className="text-sm text-white/50 hover:text-white"
                >
                  Sluiten
                </button>
              </div>
              <StickyTableWrap>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/15 bg-white/10">
                      <th className="px-3 py-2 text-left text-white">Datum</th>
                      <th className="px-3 py-2 text-center text-white">Lesuren</th>
                      <th className="px-3 py-2 text-center text-white">Totaal</th>
                      <th className="px-3 py-2 text-center text-white">VR</th>
                      <th className="px-3 py-2 text-center text-white">VL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentTimeline.map((row) => (
                      <tr key={row.date} className="border-b border-white/8">
                        <td className="px-3 py-2 text-white">
                          {row.dayName} {formatDateDisplay(new Date(`${row.date}T12:00:00`))}
                        </td>
                        <td className="px-3 py-2 text-center text-white/70">
                          {row.hours.map((h) => `L${h}`).join(', ') || '—'}
                        </td>
                        <td className="px-3 py-2 text-center font-semibold text-white">
                          {row.total}
                        </td>
                        <td className="px-3 py-2 text-center text-blue-200">{row.vr}</td>
                        <td className="px-3 py-2 text-center text-emerald-200">{row.vl}</td>
                      </tr>
                    ))}
                    {studentTimeline.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center text-white/50">
                          Geen chill-outs voor deze student in dit schooljaar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </StickyTableWrap>
            </div>
          )}
        </div>
      )}

      {tab === 'days' && (
        <div className="space-y-4">
          <input
            type="search"
            value={dayQuery}
            onChange={(e) => setDayQuery(e.target.value)}
            placeholder="Zoek op datum (YYYY-MM-DD) of dag…"
            className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#E85A5A]/40"
          />

          <div className="glass-effect overflow-hidden rounded-xl border border-white/12">
            <StickyTableWrap>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/15 bg-white/10">
                    <th className="px-3 py-2 text-left text-white">Datum</th>
                    <th className="px-3 py-2 text-center text-white">Studenten</th>
                    <th className="px-3 py-2 text-center text-white">Totaal</th>
                    <th className="px-3 py-2 text-center text-white">VR</th>
                    <th className="px-3 py-2 text-center text-white">VL</th>
                    <th className="px-3 py-2 text-right text-white"> </th>
                  </tr>
                </thead>
                <tbody>
                  {days.map((d) => (
                    <tr key={d.date} className="border-b border-white/8 hover:bg-white/[0.04]">
                      <td className="px-3 py-2 text-white">
                        {d.dayName} {formatDateDisplay(new Date(`${d.date}T12:00:00`))}
                      </td>
                      <td className="px-3 py-2 text-center text-white/70">{d.studentsPresent}</td>
                      <td className="px-3 py-2 text-center font-semibold text-white">{d.total}</td>
                      <td className="px-3 py-2 text-center text-blue-200">{d.vr}</td>
                      <td className="px-3 py-2 text-center text-emerald-200">{d.vl}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedDate(d.date)}
                          className="rounded-lg px-2 py-1 text-xs text-[#E85A5A] hover:bg-[#E85A5A]/15"
                        >
                          Bekijken
                        </button>
                      </td>
                    </tr>
                  ))}
                  {days.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-white/50">
                        Geen daily records gevonden in dit archief.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </StickyTableWrap>
          </div>

          {dayDetail?.record && (
            <div className="glass-effect rounded-xl border border-[#E85A5A]/25 p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {dayDetail.record.dayName}{' '}
                    {formatDateDisplay(new Date(`${dayDetail.record.date}T12:00:00`))}
                  </h3>
                  <p className="text-sm text-white/55">
                    Daily record · {dayDetail.rows.length} studenten · alleen-lezen
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="text-sm text-white/50 hover:text-white"
                >
                  Sluiten
                </button>
              </div>
              <StickyTableWrap>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/15 bg-white/10">
                      <th className="px-3 py-2 text-left text-white">Student</th>
                      <th className="px-3 py-2 text-left text-white">Klas</th>
                      <th className="px-3 py-2 text-center text-white">Lesuren</th>
                      <th className="px-3 py-2 text-center text-white">Totaal</th>
                      <th className="px-3 py-2 text-center text-white">VR</th>
                      <th className="px-3 py-2 text-center text-white">VL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayDetail.rows.map((row) => (
                      <tr key={row.studentId} className="border-b border-white/8">
                        <td className="px-3 py-2 font-medium text-white">{row.name}</td>
                        <td className="px-3 py-2 text-white/75">{row.klas}</td>
                        <td className="px-3 py-2 text-center text-white/70">
                          {Object.keys(row.byHour)
                            .map((h) => `L${h}`)
                            .join(', ') || '—'}
                        </td>
                        <td className="px-3 py-2 text-center font-semibold text-white">
                          {row.total}
                        </td>
                        <td className="px-3 py-2 text-center text-blue-200">{row.vr}</td>
                        <td className="px-3 py-2 text-center text-emerald-200">{row.vl}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </StickyTableWrap>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
