'use client';

import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  buildStudentGrade,
  buildStudentName,
  parseBulkStudentLines,
} from '@/lib/studentImport';

export type BulkPreviewRow = {
  name: string;
  klas: string;
  status: 'Actief' | 'Inactief';
};

type Props = {
  onConfirm: (rows: BulkPreviewRow[]) => Promise<void>;
  defaultKlas?: string;
};

function rowsFromExcel(jsonData: Record<string, unknown>[]): BulkPreviewRow[] {
  return jsonData
    .map((row) => {
      const name = buildStudentName(row);
      const klas = buildStudentGrade(row);
      return {
        name,
        klas,
        status: 'Actief' as const,
      };
    })
    .filter((r) => r.name);
}

export default function StudentBulkImport({ onConfirm, defaultKlas = '' }: Props) {
  const [mode, setMode] = useState<'paste' | 'excel'>('paste');
  const [bulkText, setBulkText] = useState('');
  const [pending, setPending] = useState<BulkPreviewRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fileName, setFileName] = useState('');

  const preview = useMemo(() => pending || [], [pending]);
  const missingKlas = preview.filter((r) => !r.klas.trim()).length;

  const buildPastePreview = () => {
    setError(null);
    setSuccess(null);
    const parsed = parseBulkStudentLines(bulkText).map((r) => ({
      name: r.name,
      klas: r.grade || defaultKlas,
      status: 'Actief' as const,
    }));
    if (!parsed.length) {
      setPending(null);
      setError('Geen geldige regels. Voorbeeld: Achternaam;Voornaam;Klas');
      return;
    }
    setPending(parsed);
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setSuccess(null);
    setFileName(file.name);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: '',
        raw: false,
      });
      const rows = rowsFromExcel(jsonData).map((r) => ({
        ...r,
        klas: r.klas || defaultKlas,
      }));
      if (!rows.length) {
        setPending(null);
        setError(
          'Geen leerlingen gevonden. Verwacht kolommen Voornaam+Naam/Achternaam (of Naam) en Klas.'
        );
        return;
      }
      setPending(rows);
    } catch (err) {
      setPending(null);
      setError(err instanceof Error ? err.message : 'Bestand kon niet gelezen worden');
    } finally {
      event.target.value = '';
    }
  };

  const handleConfirm = async () => {
    if (!pending?.length) return;
    if (pending.some((r) => !r.klas.trim())) {
      setError('Elke leerling heeft een klas nodig. Vul klas in het bestand/plaktekst of kies een standaardklas.');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await onConfirm(pending);
      setSuccess(`${pending.length} leerlingen geïmporteerd`);
      setPending(null);
      setBulkText('');
      setFileName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import mislukt');
    } finally {
      setSaving(false);
    }
  };

  const clearPreview = () => {
    setPending(null);
    setError(null);
    setSuccess(null);
    setFileName('');
  };

  return (
    <div className="glass-effect p-4 rounded-lg shadow-md mb-6 border border-white/20">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold text-white">Bulk / Excel import</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setMode('paste');
              clearPreview();
            }}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              mode === 'paste'
                ? 'bg-brand-green text-white border-transparent'
                : 'bg-white/10 text-white/90 border-white/20'
            }`}
          >
            Plakken
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('excel');
              clearPreview();
            }}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              mode === 'excel'
                ? 'bg-brand-green text-white border-transparent'
                : 'bg-white/10 text-white/90 border-white/20'
            }`}
          >
            Excel / CSV
          </button>
        </div>
      </div>

      <p className="text-xs text-white/70 mb-3">
        Eerst preview, daarna bevestigen. Aanbevolen:{' '}
        <code className="text-white/90">Achternaam;Voornaam;Klas</code> of Smartschool{' '}
        <code className="text-white/90">Voornaam + Naam + Klas</code>.
      </p>

      {mode === 'paste' ? (
        <div className="space-y-3">
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 text-sm font-mono bg-white/10 border border-white/20 rounded-md text-white placeholder-white/40 focus:outline-none focus:border-white/50"
            placeholder={'Degrendele;Leandro;1 Aarde\nGeers;Lewis;1 Aarde\nLisa Janssens;2 Vuur'}
          />
          <button
            type="button"
            onClick={buildPastePreview}
            className="px-4 py-2 text-sm bg-white/15 text-white rounded-lg hover:bg-white/25 border border-white/20"
          >
            Preview tonen
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-brand-green text-white rounded-lg cursor-pointer hover:bg-emerald-600">
            Bestand selecteren
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
          </label>
          {fileName && <span className="text-sm text-white/70 ml-2">{fileName}</span>}
        </div>
      )}

      {error && (
        <div className="mt-3 p-2 text-sm rounded bg-red-500/20 border border-red-400/40 text-red-100">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-3 p-2 text-sm rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-100">
          {success}
        </div>
      )}

      {preview.length > 0 && (
        <div className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h3 className="text-sm font-semibold text-white">
              Preview — {preview.length} leerlingen
              {missingKlas > 0 ? ` (${missingKlas} zonder klas)` : ''}
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={clearPreview}
                className="px-3 py-1.5 text-sm bg-white/10 text-white rounded-lg border border-white/20"
              >
                Annuleren
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleConfirm}
                className="px-3 py-1.5 text-sm bg-brand-green text-white rounded-lg hover:bg-emerald-600 disabled:opacity-60"
              >
                {saving ? 'Opslaan…' : `Bevestigen (${preview.length})`}
              </button>
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto rounded-lg border border-white/15 bg-black/20">
            <table className="w-full text-left text-xs text-white/90">
              <thead className="sticky top-0 bg-black/40 text-white/70">
                <tr>
                  <th className="px-3 py-2 w-10">#</th>
                  <th className="px-3 py-2">Naam</th>
                  <th className="px-3 py-2">Klas</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, idx) => (
                  <tr key={`${row.name}-${idx}`} className="border-t border-white/10">
                    <td className="px-3 py-1.5 text-white/50">{idx + 1}</td>
                    <td className="px-3 py-1.5">{row.name}</td>
                    <td className={`px-3 py-1.5 ${row.klas ? '' : 'text-amber-300'}`}>
                      {row.klas || '— ontbreekt —'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
