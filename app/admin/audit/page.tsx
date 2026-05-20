'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { loadData, repairStudentChilloutEntries, repairAllChilloutEntries } from '@/lib/storage';
import {
  countChillOutsInStudentEntries,
  formatDateDisplay,
  getHourSlot,
  parseRecordDate,
} from '@/lib/utils';
import { isAdmin } from '@/lib/auth';

function slotSummary(slot: unknown): string {
  if (!slot || (Array.isArray(slot) && slot.length === 0)) return '—';
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

type DayRow = {
  dateIso: string;
  date: string;
  total: number;
  vr: number;
  vl: number;
  generic: number;
  slots: string;
};

type AppDataShape = Awaited<ReturnType<typeof loadData>>;
type StudentMatch = AppDataShape['students'][number];

async function sumAllMatches(data: AppDataShape, matches: StudentMatch[]) {
  const sum = { total: 0, vr: 0, vl: 0, generic: 0 };
  for (const student of matches) {
    for (const record of Object.values(data.dailyRecords)) {
      const entries = record.entries[student.id] as
        | Record<string | number, unknown>
        | undefined;
      const c = countChillOutsInStudentEntries(entries);
      sum.total += c.total;
      sum.vr += c.vr;
      sum.vl += c.vl;
      sum.generic += c.generic;
    }
  }
  return sum;
}

export default function AuditStudentPage() {
  const [name, setName] = useState('Amber');
  const [klas, setKlas] = useState('MGB');
  const [rows, setRows] = useState<DayRow[]>([]);
  const [totals, setTotals] = useState({ total: 0, vr: 0, vl: 0, generic: 0 });
  const [studentInfo, setStudentInfo] = useState('');
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [repairingAll, setRepairingAll] = useState(false);
  const [repairMsg, setRepairMsg] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [dataQualityMsg, setDataQualityMsg] = useState('');
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setAllowed(isAdmin());
  }, []);

  const runAudit = async () => {
    setLoading(true);
    setRepairMsg('');
    setDataQualityMsg('');
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
        setStudentId('');
        setRows([]);
        setTotals({ total: 0, vr: 0, vl: 0, generic: 0 });
        setDataQualityMsg('');
        return;
      }

      if (matches.length > 1) {
        setDuplicateWarning(
          `Let op: ${matches.length} studenten met deze naam/klas. Totalen hieronder zijn alleen voor de eerste. IDs: ${matches.map((s) => s.id).join(', ')}`
        );
      } else {
        setDuplicateWarning('');
      }

      const student = matches[0];
      setStudentId(student.id);
      const combined = matches.length > 1 ? await sumAllMatches(data, matches) : null;
      setStudentInfo(
        combined
          ? `${student.name} | ${student.klas} | ${matches.length} profielen — gecombineerd totaal: ${combined.total} (VR ${combined.vr}, VL ${combined.vl}, zonder type ${combined.generic})`
          : `${student.name} | ${student.klas} | id: ${student.id}`
      );

      const dayRows: DayRow[] = [];
      const sum = { total: 0, vr: 0, vl: 0, generic: 0 };

      Object.keys(data.dailyRecords)
        .sort()
        .forEach((dateIso) => {
          const entries = data.dailyRecords[dateIso].entries[student.id] as
            | Record<string | number, unknown>
            | undefined;
          if (!entries) return;

          const c = countChillOutsInStudentEntries(entries);
          if (c.total === 0) return;

          const slotParts: string[] = [];
          for (let hour = 1; hour <= 7; hour++) {
            const slot = getHourSlot(entries, hour);
            if (slot.length > 0) slotParts.push(`L${hour}:${slotSummary(slot)}`);
          }

          const parsed = parseRecordDate(dateIso);
          dayRows.push({
            dateIso,
            date: parsed ? formatDateDisplay(parsed) : dateIso,
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

      const sumOk =
        sum.total === dayRows.reduce((acc, r) => acc + r.total, 0) &&
        sum.vr === dayRows.reduce((acc, r) => acc + r.vr, 0) &&
        sum.vl === dayRows.reduce((acc, r) => acc + r.vl, 0);

      if (sumOk && sum.total > 0) {
        setDataQualityMsg(
          `Gegevens in orde: ${dayRows.length} dagen met chill-outs, som = ${sum.total} (VR ${sum.vr} + VL ${sum.vl} + zonder type ${sum.generic}). ` +
            `Repareren wijzigt dit meestal niet — het formaat is al array per lesuur. ` +
            `Om het totaal te verlagen moet je per dag chill-outs verwijderen via Dagelijks.`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const runRepairAll = async () => {
    const ok = window.confirm(
      'Dit normaliseert ALLE chill-outs van ALLE studenten in Supabase. Alleen doen als tellingen systematisch te hoog zijn. Doorgaan?'
    );
    if (!ok) return;
    setRepairingAll(true);
    setRepairMsg('');
    try {
      const result = await repairAllChilloutEntries();
      setRepairMsg(
        `Alles gerepareerd: ${result.datesUpdated} van ${result.datesChecked} dagen, ${result.studentsTouched} studenten. ` +
          `Voor: ${result.before.total} chill-outs → Na: ${result.after.total} (VR ${result.after.vr}, VL ${result.after.vl}, zonder type ${result.after.generic}).`
      );
      await runAudit();
    } catch (e) {
      setRepairMsg('Fout: ' + (e instanceof Error ? e.message : 'Onbekend'));
    } finally {
      setRepairingAll(false);
    }
  };

  const runRepair = async () => {
    if (!studentId) return;
    const ok = window.confirm(
      'Dit normaliseert opgeslagen chill-outs voor deze student in Supabase (lege slots, dubbele lesuur-keys, legacy → array). Doorgaan?'
    );
    if (!ok) return;

    setRepairing(true);
    setRepairMsg('');
    try {
      const result = await repairStudentChilloutEntries(studentId);
      setRepairMsg(
        `Klaar: ${result.datesUpdated} van ${result.datesChecked} dagen bijgewerkt. ` +
          `Voor: Totaal ${result.before.total} (VR ${result.before.vr}, VL ${result.before.vl}, zonder type ${result.before.generic}). ` +
          `Na: Totaal ${result.after.total} (VR ${result.after.vr}, VL ${result.after.vl}, zonder type ${result.after.generic}).`
      );
      await runAudit();
    } catch (e) {
      setRepairMsg('Fout: ' + (e instanceof Error ? e.message : 'Onbekend'));
    } finally {
      setRepairing(false);
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
        <h1 className="text-2xl font-bold mb-2">Audit &amp; reparatie chill-outs</h1>
        <p className="text-white/60 text-sm mb-6">
          Controleer tellingen per dag, open Dagelijks om te corrigeren, of repareer het
          opslagformaat in Supabase (zonder andere studenten te wijzigen).
        </p>

        <div className="flex flex-wrap gap-3 mb-4">
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
          <button
            type="button"
            onClick={runRepair}
            disabled={!studentId || repairing || repairingAll || loading}
            className="px-4 py-2 rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-50"
          >
            {repairing ? 'Repareren…' : 'Repareer deze student'}
          </button>
          <button
            type="button"
            onClick={runRepairAll}
            disabled={repairing || repairingAll || loading}
            className="px-4 py-2 rounded bg-red-700 hover:bg-red-600 disabled:opacity-50"
          >
            {repairingAll ? 'Alles repareren…' : 'Repareer alle data'}
          </button>
          <Link href="/import" className="px-4 py-2 rounded bg-white/10 border border-white/20">
            ← Rapporten
          </Link>
        </div>

        {repairMsg && (
          <p className="text-sm text-amber-100/90 mb-4 p-3 rounded bg-amber-500/15 border border-amber-400/30">
            {repairMsg}
          </p>
        )}

        {duplicateWarning && (
          <p className="text-sm text-amber-100/90 mb-4 p-3 rounded bg-amber-500/15 border border-amber-400/30">
            {duplicateWarning}
          </p>
        )}

        {studentInfo && <p className="mb-4 font-medium text-white/90">{studentInfo}</p>}

        {dataQualityMsg && (
          <p className="text-sm text-emerald-100/95 mb-4 p-3 rounded-lg border border-emerald-400/35 bg-emerald-500/15">
            {dataQualityMsg}
          </p>
        )}

        {totals.total > 0 && (
          <div className="glass-effect rounded-lg p-4 mb-6 border border-white/20">
            <p>
              <strong>Totaal:</strong> {totals.total} · <strong>VR:</strong> {totals.vr} ·{' '}
              <strong>VL:</strong> {totals.vl} · <strong>Zonder VR/VL:</strong> {totals.generic}
              {rows.length > 0 && (
                <span className="text-white/55 font-normal">
                  {' '}
                  · {rows.length} dagen
                </span>
              )}
            </p>
            <p className="text-xs text-white/50 mt-2">
              &quot;Zonder VR/VL&quot; = chill-outs zonder VR/VL aangevinkt (niet hetzelfde als
              &quot;fout&quot;). Totaal = VR + VL + zonder type. Reparatie fixeert alleen
              opslagfouten, niet te hoge aantallen.
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
                <th className="py-2 pr-2 text-center">Z/VR/VL</th>
                <th className="py-2 pr-4">Formaat</th>
                <th className="py-2">Actie</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.dateIso} className="border-b border-white/10">
                  <td className="py-2 pr-4">{r.date}</td>
                  <td className="py-2 text-center">{r.total}</td>
                  <td className="py-2 text-center text-blue-200">{r.vr}</td>
                  <td className="py-2 text-center text-emerald-200">{r.vl}</td>
                  <td className="py-2 text-center text-red-200">{r.generic}</td>
                  <td className="py-2 text-xs text-white/50 max-w-xs truncate" title={r.slots}>
                    {r.slots}
                  </td>
                  <td className="py-2">
                    <Link
                      href={`/daily/${r.dateIso}`}
                      className="text-blue-300 hover:text-blue-200 underline text-xs"
                    >
                      Dagelijks
                    </Link>
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
