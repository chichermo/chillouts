'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { loadData } from '@/lib/storage';
import {
  countChillOutsInStudentEntries,
  formatDateDisplay,
  parseRecordDate,
} from '@/lib/utils';
import { isAdmin } from '@/lib/auth';

function slotSummary(slot: unknown): string {
  if (!slot) return '—';
  if (Array.isArray(slot)) {
    const len = slot.length;
    const empty = slot.filter(
      (e) => e && typeof e === 'object' && !('type' in e) && !('count' in e)
    ).length;
    return `array[${len}]${empty ? ` (${empty} leeg)` : ''}`;
  }
  if (typeof slot === 'object' && slot !== null && 'count' in slot) {
    const o = slot as { count: number; type?: unknown };
    return `legacy{count:${o.count},type:${o.type ?? 'null'}}`;
  }
  return '?';
}

export default function AuditStudentPage() {
  const [name, setName] = useState('Amber');
  const [klas, setKlas] = useState('MGB');
  const [rows, setRows] = useState<
    {
      date: string;
      total: number;
      vr: number;
      vl: number;
      generic: number;
      slots: string;
    }[]
  >([]);
  const [totals, setTotals] = useState({ total: 0, vr: 0, vl: 0, generic: 0 });
  const [studentInfo, setStudentInfo] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setAllowed(isAdmin());
  }, []);

  const runAudit = async () => {
    setLoading(true);
    try {
      const data = await loadData();
      const q = name.trim().toLowerCase();
      const k = klas.trim().toLowerCase();
      const matches = data.students.filter(
        (s) =>
          s.name.toLowerCase().includes(q) &&
          (k === '' || s.klas.toLowerCase().includes(k))
      );

      if (matches.length === 0) {
        setStudentInfo('Geen student gevonden.');
        setRows([]);
        setTotals({ total: 0, vr: 0, vl: 0, generic: 0 });
        return;
      }

      const student = matches[0];
      setStudentInfo(`${student.name} | ${student.klas} | id: ${student.id}`);

      const dayRows: typeof rows = [];
      const sum = { total: 0, vr: 0, vl: 0, generic: 0 };

      Object.keys(data.dailyRecords)
        .sort()
        .forEach((date) => {
          const entries = data.dailyRecords[date].entries[student.id] as
            | Record<string | number, unknown>
            | undefined;
          if (!entries) return;

          const c = countChillOutsInStudentEntries(entries);
          if (c.total === 0) return;

          const slotParts: string[] = [];
          for (let hour = 1; hour <= 7; hour++) {
            const slot = entries[hour] ?? entries[String(hour)];
            if (slot) slotParts.push(`L${hour}:${slotSummary(slot)}`);
          }

          const parsed = parseRecordDate(date);
          dayRows.push({
            date: parsed ? formatDateDisplay(parsed) : date,
            ...c,
            slots: slotParts.join(' · '),
          });
          sum.total += c.total;
          sum.vr += c.vr;
          sum.vl += c.vl;
          sum.generic += c.generic;
        });

      setRows(dayRows);
      setTotals(sum);
    } finally {
      setLoading(false);
    }
  };

  if (!allowed) {
    return (
      <div className="min-h-screen p-8 text-white">
        <Navigation />
        <p>Alleen voor beheerders.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navigation />
      <div className="max-w-5xl mx-auto px-4 py-8 text-white">
        <h1 className="text-2xl font-bold mb-2">Audit chill-out telling</h1>
        <p className="text-white/60 text-sm mb-6">
          Alleen-lezen. Vergelijk met Dagelijks per dag. Geen wijzigingen in de database.
        </p>

        <div className="flex flex-wrap gap-3 mb-6">
          <input
            className="px-3 py-2 rounded bg-white/10 border border-white/20"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Naam"
          />
          <input
            className="px-3 py-2 rounded bg-white/10 border border-white/20"
            value={klas}
            onChange={(e) => setKlas(e.target.value)}
            placeholder="Klas (bv. MGB)"
          />
          <button
            type="button"
            onClick={runAudit}
            disabled={loading}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? 'Laden…' : 'Analyseren'}
          </button>
          <Link href="/import" className="px-4 py-2 rounded bg-white/10 border border-white/20">
            ← Rapporten
          </Link>
        </div>

        {studentInfo && (
          <p className="mb-4 font-medium text-white/90">{studentInfo}</p>
        )}

        {totals.total > 0 && (
          <div className="glass-effect rounded-lg p-4 mb-6 border border-white/20">
            <p>
              <strong>Totaal:</strong> {totals.total} · <strong>VR:</strong> {totals.vr} ·{' '}
              <strong>VL:</strong> {totals.vl} · <strong>Chillouts (genérico):</strong>{' '}
              {totals.generic}
            </p>
            <p className="text-xs text-white/50 mt-2">
              Moet gelijk zijn aan Rapporten → Statistieken per Student (zelfde filters).
            </p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/20 text-left">
                <th className="py-2 pr-4">Dag</th>
                <th className="py-2 pr-2 text-center">Totaal</th>
                <th className="py-2 pr-2 text-center">VR</th>
                <th className="py-2 pr-2 text-center">VL</th>
                <th className="py-2 pr-2 text-center">Chill.</th>
                <th className="py-2">Formaat per lesuur</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.date} className="border-b border-white/10">
                  <td className="py-2 pr-4">{r.date}</td>
                  <td className="py-2 text-center">{r.total}</td>
                  <td className="py-2 text-center text-blue-200">{r.vr}</td>
                  <td className="py-2 text-center text-emerald-200">{r.vl}</td>
                  <td className="py-2 text-center text-red-200">{r.generic}</td>
                  <td className="py-2 text-xs text-white/50 max-w-md truncate" title={r.slots}>
                    {r.slots}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
