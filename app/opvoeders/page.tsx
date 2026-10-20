'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUser, refreshCurrentUserFromDb } from '@/lib/auth';
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

const EMPTY: OpvoedersCalendar = { remarks: {}, weeks: {} };

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
      if (!current || current.role !== 'admin') {
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
    scheduleSave({
      ...dataRef.current,
      weeks: { ...dataRef.current.weeks, [weekStart]: value },
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
    <div className="min-h-screen bg-[#14141f] text-white">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 pt-6 md:px-8">
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

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 md:px-8">
        <h1 className="text-3xl font-black tracking-tight">Opvoeders</h1>
        <p className="mt-1 text-sm text-white/55">{formatWeekRange(weekStart)}</p>
        {error ? (
          <p className="mt-4 rounded-2xl border border-[#E897A3]/35 bg-[#E897A3]/12 px-4 py-3 text-sm">
            {error}
          </p>
        ) : null}

        <div className="mt-6 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="overflow-x-auto rounded-[1.5rem] border border-white/10 bg-[#16161f]">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[7.5rem_repeat(5,minmax(0,1fr))] border-b border-white/10">
                <div className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-white/40">
                  Lesuur
                </div>
                {days.map((dayKey, index) => {
                  const today = dayKey === todayKey;
                  return (
                    <div key={dayKey} className="px-2 py-3 text-center">
                      <div className="text-xs font-semibold uppercase tracking-wide text-white/40">
                        {weekdayLabel(index)}
                      </div>
                      <div
                        className={`mx-auto mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                          today ? 'bg-[#EA98A6] font-bold text-[#1a1a1a]' : 'text-white'
                        }`}
                      >
                        {formatDayNumber(dayKey)}
                      </div>
                    </div>
                  );
                })}
              </div>
              {LESSON_PERIODS.map((lesson) => (
                <div
                  key={lesson.id}
                  className="grid grid-cols-[7.5rem_repeat(5,minmax(0,1fr))] border-b border-white/10 last:border-b-0"
                >
                  <div className="px-3 py-3">
                    <div className="text-sm font-semibold">{lesson.id}</div>
                    <div className="text-[11px] text-white/45">{lesson.label}</div>
                  </div>
                  {days.map((dayKey) => {
                    const key = remarkKey(dayKey, lesson.id);
                    const today = dayKey === todayKey;
                    return (
                      <div
                        key={key}
                        className={`border-l border-white/10 ${today ? 'bg-[#EA98A6]/10' : ''}`}
                      >
                        <textarea
                          value={data.remarks[key] ?? ''}
                          readOnly={!ready}
                          rows={2}
                          onChange={(event) => setRemark(dayKey, lesson.id, event.target.value)}
                          className="h-full min-h-[3.25rem] w-full resize-none bg-transparent px-2 py-2 text-sm text-white outline-none"
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <aside className="flex min-h-[28rem] flex-col rounded-[1.5rem] border border-white/10 bg-[#16161f] p-4 lg:sticky lg:top-4">
            <p className="text-sm text-white">{formatWeekRange(weekStart)}</p>
            <textarea
              value={data.weeks[weekStart] ?? ''}
              readOnly={!ready}
              onChange={(event) => setWeekNote(event.target.value)}
              className="mt-3 min-h-0 flex-1 resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white outline-none"
            />
            <p className="mt-2 h-5 text-xs text-white/45">{ready ? status : 'Laden…'}</p>
          </aside>
        </div>
      </main>
    </div>
  );
}
