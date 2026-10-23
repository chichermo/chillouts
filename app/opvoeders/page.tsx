'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUser, hasPermission, refreshCurrentUserFromDb } from '@/lib/auth';
import {
  LESSON_PERIODS,
  addDays,
  brusselsTodayKey,
  formatDayNumber,
  formatWeekRange,
  loadOpvoedersCalendar,
  mondayKey,
  remarkKey,
  saveOpvoedersCalendar,
  weekDayKeys,
  weekdayLabel,
  type OpvoedersCalendar,
} from '@/lib/opvoedersCalendar';

const EMPTY: OpvoedersCalendar = { remarks: {}, weeks: {}, note: '' };

export default function OpvoedersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [weekStart, setWeekStart] = useState(() => mondayKey(brusselsTodayKey()));
  const [data, setData] = useState<OpvoedersCalendar>(EMPTY);
  const dataRef = useRef<OpvoedersCalendar>(EMPTY);
  const readyRef = useRef(false);
  const saveTimer = useRef<number | null>(null);
  const todayKey = brusselsTodayKey();
  const days = weekDayKeys(weekStart);

  useEffect(() => {
    const init = async () => {
      const fresh = await refreshCurrentUserFromDb();
      const current = fresh || getCurrentUser();
      if (!current || !hasPermission(current, 'portal_opvoeders')) {
        router.replace('/portals');
        return;
      }
      try {
        const stored = await loadOpvoedersCalendar();
        dataRef.current = stored;
        setData(stored);
        readyRef.current = true;
        setReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Kalender laden mislukt');
      } finally {
        setLoading(false);
      }
    };
    init();
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [router]);

  function scheduleSave(next: OpvoedersCalendar) {
    dataRef.current = next;
    setData(next);
    if (!readyRef.current) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setStatus('Bewaren…');
    saveTimer.current = window.setTimeout(() => {
      const snapshot = dataRef.current;
      void saveOpvoedersCalendar(snapshot)
        .then(() => {
          if (dataRef.current === snapshot) setStatus('Bewaard');
        })
        .catch(() => setStatus('Bewaren mislukt'));
    }, 400);
  }

  function setRemark(dayKey: string, lessonId: number, value: string) {
    const key = remarkKey(dayKey, lessonId);
    scheduleSave({
      ...dataRef.current,
      remarks: { ...dataRef.current.remarks, [key]: value },
    });
  }

  function setWeekNote(value: string) {
    const weeks = { ...dataRef.current.weeks };
    for (const key of Object.keys(weeks)) weeks[key] = value;
    scheduleSave({
      ...dataRef.current,
      note: value,
      weeks,
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#14141f] text-white">
        <p className="text-sm text-white/60">Kalender laden…</p>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#14141f] text-white">
      <header className="flex shrink-0 items-center justify-between gap-3 px-5 py-4">
        <Link
          href="/portals"
          className="rounded-xl border border-white/12 bg-white/[0.04] px-3.5 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          ← Apps
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekStart((current) => addDays(current, -7))}
            className="rounded-xl border border-white/12 bg-white/[0.04] px-3.5 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            Vorige
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(mondayKey(brusselsTodayKey()))}
            className="rounded-xl border border-white/12 bg-white/[0.04] px-3.5 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            Deze week
          </button>
          <button
            type="button"
            onClick={() => setWeekStart((current) => addDays(current, 7))}
            className="rounded-xl border border-white/12 bg-white/[0.04] px-3.5 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            Volgende
          </button>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col px-5 pb-5">
        <div className="mb-3 flex shrink-0 items-baseline gap-4">
          <h1 className="text-2xl font-black tracking-tight">Opvoeders</h1>
          <p className="text-base text-white/70">{formatWeekRange(weekStart)}</p>
        </div>
        {error ? (
          <p className="mb-3 shrink-0 rounded-2xl border border-[#E897A3]/35 bg-[#E897A3]/12 px-4 py-3 text-sm">
            {error}
          </p>
        ) : null}

        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-2 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-1">
          <div className="flex min-h-0 flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#16161f]">
            <div className="grid shrink-0 grid-cols-[6.75rem_repeat(5,minmax(0,1fr))] border-b border-white/10">
              <div className="px-3 py-3 text-sm font-semibold uppercase tracking-wide text-white/50">
                Lesuur
              </div>
              {days.map((dayKey, index) => {
                const today = dayKey === todayKey;
                return (
                  <div key={dayKey} className="px-2 py-3 text-center">
                    <div className="text-sm font-semibold uppercase tracking-wide text-white/50">
                      {weekdayLabel(index)}
                    </div>
                    <div
                      className={`mx-auto mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full text-base ${
                        today ? 'bg-[#EA98A6] font-bold text-[#1a1a1a]' : 'text-white'
                      }`}
                    >
                      {formatDayNumber(dayKey)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              {LESSON_PERIODS.map((lesson) => (
                <div
                  key={lesson.id}
                  className="grid min-h-0 flex-1 grid-cols-[6.75rem_repeat(5,minmax(0,1fr))] border-b border-white/10 last:border-b-0"
                >
                  <div className="flex flex-col justify-center px-3">
                    <div className="text-base font-semibold">{lesson.id}</div>
                    <div className="text-sm text-white/60">{lesson.label}</div>
                  </div>
                  {days.map((dayKey) => {
                    const key = remarkKey(dayKey, lesson.id);
                    const today = dayKey === todayKey;
                    return (
                      <div
                        key={key}
                        className={`min-h-0 border-l border-white/10 ${today ? 'bg-[#EA98A6]/10' : ''}`}
                      >
                        <textarea
                          value={data.remarks[key] ?? ''}
                          readOnly={!ready}
                          onChange={(event) => setRemark(dayKey, lesson.id, event.target.value)}
                          className="h-full w-full resize-none bg-transparent px-3 py-2 text-base leading-snug text-white outline-none"
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <aside className="flex min-h-0 flex-col rounded-[1.5rem] border border-white/10 bg-[#16161f] p-4">
            <p className="shrink-0 text-base text-white">{formatWeekRange(weekStart)}</p>
            <textarea
              value={data.note}
              readOnly={!ready}
              onChange={(event) => setWeekNote(event.target.value)}
              className="mt-3 min-h-0 flex-1 resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-base leading-relaxed text-white outline-none"
            />
            <p className="mt-2 h-5 shrink-0 text-sm text-white/50">{ready ? status : 'Laden…'}</p>
          </aside>
        </div>
      </main>
    </div>
  );
}
