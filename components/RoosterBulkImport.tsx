'use client';

import { useMemo, useState } from 'react';
import { parseRoosterPdfBytes } from '@/lib/roosterPdfImport';
import {
  parseRoosterExcelBytes,
  type RoosterImportResult,
} from '@/lib/roosterExcelImport';
import { DAY_NAMES, HOURS, slotKey } from '@/lib/timetables';
import type { TimetableSlots } from '@/types';

type Props = {
  selectedYear: string;
  onConfirm: (timetables: Array<{ klas: string; slots: TimetableSlots }>) => Promise<void>;
  onClose?: () => void;
};

function isExcelFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith('.xlsx') ||
    name.endsWith('.xls') ||
    file.type.includes('spreadsheet') ||
    file.type === 'application/vnd.ms-excel' ||
    file.type ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
}

function isPdfFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
}

export default function RoosterBulkImport({ selectedYear, onConfirm, onClose }: Props) {
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<RoosterImportResult | null>(null);
  const [expandedKlas, setExpandedKlas] = useState<string | null>(null);

  const totalSlots = useMemo(
    () =>
      (result?.timetables || []).reduce(
        (sum, t) => sum + Object.values(t.slots).filter(Boolean).length,
        0
      ),
    [result]
  );

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    setFileName(file.name);
    setParsing(true);
    try {
      const buf = await file.arrayBuffer();
      let parsed: RoosterImportResult;

      if (isExcelFile(file)) {
        parsed = await parseRoosterExcelBytes(buf);
        if (!parsed.timetables.length) {
          throw new Error(
            parsed.warnings[0] ||
              'Geen roosters gevonden in dit Excel-bestand. Verwacht één blad per klas (Lesuur + weekdagen).'
          );
        }
      } else if (isPdfFile(file)) {
        const pdf = await parseRoosterPdfBytes(buf);
        parsed = { ...pdf, source: 'pdf' };
        if (!parsed.timetables.length) {
          throw new Error(
            parsed.warnings[0] ||
              'Geen roosters gevonden in deze PDF. Verwacht Untis/Stamina klasrooster.'
          );
        }
      } else {
        throw new Error('Kies een PDF (.pdf) of Excel-bestand (.xlsx).');
      }

      setResult(parsed);
      setExpandedKlas(parsed.timetables[0]?.klas || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bestand kon niet gelezen worden');
    } finally {
      setParsing(false);
      event.target.value = '';
    }
  };

  const handleConfirm = async () => {
    if (!result?.timetables.length) return;
    if (!selectedYear) {
      setError('Selecteer of maak eerst een schooljaar bovenaan.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onConfirm(result.timetables);
      setResult(null);
      setFileName('');
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import mislukt');
    } finally {
      setSaving(false);
    }
  };

  const sourceLabel =
    result?.source === 'excel' ? 'Excel' : result?.source === 'pdf' ? 'PDF' : null;

  return (
    <div className="glass-effect rounded-xl p-5 border border-white/20 mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-lg font-bold text-white">Bulk import roosters</h2>
          <p className="text-sm text-white/70 mt-1">
            Upload een Untis/Stamina <strong className="text-white/90">PDF</strong> of het
            geëxporteerde <strong className="text-white/90">Excel</strong>-rooster. Alles
            wordt opgeslagen onder{' '}
            <span className="text-white font-medium">{selectedYear || '…'}</span>. Eerst
            preview, daarna bevestigen.
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded-lg bg-white/10 text-white border border-white/20"
          >
            Sluiten
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-500">
          {parsing ? 'Bestand lezen…' : 'PDF of Excel selecteren'}
          <input
            type="file"
            accept=".pdf,.xlsx,.xls,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            disabled={parsing || saving || !selectedYear}
            onChange={handleFile}
          />
        </label>
        {fileName && <span className="text-sm text-white/70">{fileName}</span>}
      </div>

      {error && (
        <div className="mt-3 p-2 text-sm rounded bg-red-500/20 border border-red-400/40 text-red-100">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-3 text-sm text-white/85">
            {sourceLabel && (
              <span className="px-2.5 py-1 rounded bg-indigo-500/25 border border-indigo-400/30 text-indigo-100">
                Bron: {sourceLabel}
              </span>
            )}
            <span className="px-2.5 py-1 rounded bg-white/10 border border-white/15">
              {result.source === 'excel'
                ? `${result.pageCount} bladen`
                : `${result.pageCount} pagina's`}
            </span>
            <span className="px-2.5 py-1 rounded bg-white/10 border border-white/15">
              {result.timetables.length} klassen
            </span>
            <span className="px-2.5 py-1 rounded bg-white/10 border border-white/15">
              {totalSlots} docent-slots
            </span>
            <span className="px-2.5 py-1 rounded bg-emerald-500/20 border border-emerald-400/30 text-emerald-100">
              Doeljaar: {selectedYear}
            </span>
            {result.year && result.year !== selectedYear && (
              <span className="px-2.5 py-1 rounded bg-amber-500/20 border border-amber-400/30 text-amber-50">
                Bestandjaar: {result.year}
              </span>
            )}
          </div>

          {result.warnings.length > 0 && (
            <div className="p-2 text-xs rounded bg-amber-500/15 border border-amber-400/30 text-amber-50 max-h-28 overflow-y-auto">
              {result.warnings.map((w, i) => (
                <div key={i}>• {w}</div>
              ))}
            </div>
          )}

          <div className="max-h-72 overflow-y-auto rounded-lg border border-white/15 bg-black/20">
            {result.timetables.map((t) => {
              const count = Object.values(t.slots).filter(Boolean).length;
              const open = expandedKlas === t.klas;
              return (
                <div key={t.klas} className="border-b border-white/10 last:border-0">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm text-white hover:bg-white/5"
                    onClick={() => setExpandedKlas(open ? null : t.klas)}
                  >
                    <span className="font-medium">{t.klas}</span>
                    <span className="text-white/55">
                      {count} slots {open ? '▴' : '▾'}
                    </span>
                  </button>
                  {open && (
                    <div className="px-3 pb-3 overflow-x-auto">
                      <table className="w-full text-[11px] border-collapse">
                        <thead>
                          <tr>
                            <th className="border border-white/15 px-1 py-1 text-white/60">
                              Uur
                            </th>
                            {DAY_NAMES.map((d) => (
                              <th
                                key={d}
                                className="border border-white/15 px-1 py-1 text-white/60"
                              >
                                {d}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {HOURS.map((h) => (
                            <tr key={h}>
                              <td className="border border-white/15 px-1 py-1 text-white/70">
                                {h}
                              </td>
                              {DAY_NAMES.map((_, di) => (
                                <td
                                  key={di}
                                  className="border border-white/15 px-1 py-1 text-white/90"
                                >
                                  {t.slots[slotKey(di, h)] || '—'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving || !selectedYear}
              onClick={handleConfirm}
              className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-60"
            >
              {saving
                ? 'Opslaan…'
                : `Bevestigen (${result.timetables.length} roosters → ${selectedYear})`}
            </button>
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setFileName('');
                setError(null);
              }}
              className="px-4 py-2 text-sm bg-white/10 text-white rounded-lg border border-white/20"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
