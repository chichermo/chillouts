'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { loadData } from '@/lib/storage';
import {
  loadTimetables,
  saveTimetable,
  getTimetableYears,
  seedTimetablesForKlassen,
  clearAllTimetableSlots,
  deleteTimetableForKlas,
  getSchoolYear,
  timetableId,
  DAY_NAMES,
  HOURS,
  slotKey,
} from '@/lib/timetables';
import type { Timetable, TimetableSlots } from '@/types';
import { sortKlassen } from '@/lib/utils';
import { isAdmin } from '@/lib/auth';

function focusTimetableCell(klas: string, dayIndex: number, hour: number): boolean {
  const inputs = document.querySelectorAll<HTMLInputElement>('input[data-timetable-cell]');
  for (const input of inputs) {
    if (
      input.dataset.timetableKlas === klas &&
      Number(input.dataset.timetableDay) === dayIndex &&
      Number(input.dataset.timetableHour) === hour
    ) {
      input.focus();
      input.select();
      return true;
    }
  }
  return false;
}

function handleTimetableSlotKeyDown(
  e: React.KeyboardEvent<HTMLInputElement>,
  klas: string,
  dayIndex: number,
  hour: number
) {
  if (e.key !== 'Tab') return;

  const hourIndex = HOURS.indexOf(hour);
  if (hourIndex < 0) return;

  let nextDay = dayIndex;
  let nextHour = hour;

  if (e.shiftKey) {
    if (hourIndex > 0) {
      nextHour = HOURS[hourIndex - 1];
    } else if (dayIndex > 0) {
      nextDay = dayIndex - 1;
      nextHour = HOURS[HOURS.length - 1];
    } else {
      return;
    }
  } else if (hourIndex < HOURS.length - 1) {
    nextHour = HOURS[hourIndex + 1];
  } else if (dayIndex < DAY_NAMES.length - 1) {
    nextDay = dayIndex + 1;
    nextHour = HOURS[0];
  } else {
    return;
  }

  e.preventDefault();
  focusTimetableCell(klas, nextDay, nextHour);
}

export default function TimetablesPage() {
  const [years, setYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [klassenFromStudents, setKlassenFromStudents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');
  const [showAddYear, setShowAddYear] = useState(false);
  const [newKlasInput, setNewKlasInput] = useState('');
  const [showAddKlas, setShowAddKlas] = useState(false);
  const [seedMsg, setSeedMsg] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [hiddenKlassen, setHiddenKlassen] = useState<string[]>([]);
  const [deletingKlas, setDeletingKlas] = useState<string | null>(null);

  useEffect(() => {
    setUserIsAdmin(isAdmin());
  }, []);

  useEffect(() => {
    const load = async () => {
      const data = await loadData();
      const klassen = sortKlassen([...new Set(data.students.map((s) => s.klas))]);
      setKlassenFromStudents(klassen);

      try {
        const y = await getTimetableYears();
        const schoolYear = getSchoolYear(new Date());
        setYears(y.length > 0 ? y : [schoolYear]);
        setSelectedYear((prev) => prev || y[0] || schoolYear);
      } catch (err) {
        console.error(err);
        alert(
          err instanceof Error
            ? err.message
            : 'Kon roosters niet laden. Voer supabase/setup_extra_tables.sql uit in Supabase.'
        );
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedYear) {
      setTimetables([]);
      setHiddenKlassen([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setHiddenKlassen([]);
    loadTimetables(selectedYear).then((t) => {
      setTimetables(t);
      setLoading(false);
    });
  }, [selectedYear]);

  const allKlassen = sortKlassen(
    [...new Set([...klassenFromStudents, ...timetables.map((t) => t.klas)])].filter(
      (k) => !hiddenKlassen.includes(k)
    )
  );

  const getTimetableForKlas = (klas: string): Timetable | undefined =>
    timetables.find((t) => t.klas === klas);

  const getSlot = (t: Timetable | undefined, dayIndex: number, hour: number): string =>
    t?.slots[slotKey(dayIndex, hour)] ?? '';

  /** Trim pas bij opslaan — niet tijdens typen (anders werkt spatie niet, bv. "Lisa F"). */
  const normalizeSlotsForSave = (slots: TimetableSlots): TimetableSlots => {
    const normalized: TimetableSlots = {};
    for (const [key, value] of Object.entries(slots || {})) {
      const trimmed = String(value).trim();
      if (trimmed) normalized[key] = trimmed;
    }
    return normalized;
  };

  const setSlot = (
    klas: string,
    dayIndex: number,
    hour: number,
    value: string
  ) => {
    const existing = getTimetableForKlas(klas);
    const slots: TimetableSlots = { ...(existing?.slots || {}) };
    const key = slotKey(dayIndex, hour);
    if (value === '') {
      delete slots[key];
    } else {
      slots[key] = value;
    }
    const updated: Timetable = {
      id: existing?.id || timetableId(selectedYear, klas),
      year: selectedYear,
      klas,
      slots,
    };
    setTimetables((prev) => {
      const idx = prev.findIndex((x) => x.klas === klas);
      const next = [...prev];
      if (idx >= 0) next[idx] = updated;
      else next.push(updated);
      return next;
    });
  };

  const filledSlotsTotal = timetables.reduce(
    (sum, t) => sum + Object.values(t.slots || {}).filter((v) => v && String(v).trim()).length,
    0
  );

  const handleSeedKlassen = async () => {
    if (!userIsAdmin) return;
    if (!selectedYear || klassenFromStudents.length === 0) return;
    setSeeding(true);
    setSeedMsg('');
    try {
      const result = await seedTimetablesForKlassen(selectedYear, klassenFromStudents);
      const loaded = await loadTimetables(selectedYear);
      setTimetables(loaded);
      setSeedMsg(
        `${result.created} roosters aangemaakt, ${result.skipped} bestonden al. Vul nu docentnamen in per lesuur.`
      );
      const y = await getTimetableYears();
      setYears(y);
    } catch (e) {
      alert('Fout: ' + (e instanceof Error ? e.message : 'Onbekend'));
    } finally {
      setSeeding(false);
    }
  };

  const handleClearAllTeachers = async () => {
    if (!userIsAdmin) return;
    if (!selectedYear) return;
    const ok = window.confirm(
      `Alle docentennamen voor ${selectedYear} wissen?\n\nDe klassen en rooster-structuur blijven behouden. Je kunt daarna opnieuw handmatig invullen.`
    );
    if (!ok) return;
    setClearing(true);
    setSeedMsg('');
    try {
      const count = await clearAllTimetableSlots(selectedYear);
      const loaded = await loadTimetables(selectedYear);
      setTimetables(loaded);
      setSeedMsg(
        `${count} roosters geleegd. Vul nu de docentnamen handmatig in en klik op Opslaan.`
      );
    } catch (e) {
      alert('Fout: ' + (e instanceof Error ? e.message : 'Onbekend'));
    } finally {
      setClearing(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const t of timetables) {
        const normalized = normalizeSlotsForSave(t.slots || {});
        await saveTimetable({ ...t, slots: normalized });
      }
      const loaded = await loadTimetables(selectedYear);
      setTimetables(loaded);
      const y = await getTimetableYears();
      setYears(y);
      alert('Roosters opgeslagen.');
    } catch (e) {
      console.error(e);
      alert('Fout bij opslaan: ' + (e instanceof Error ? e.message : 'Onbekend'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddYear = () => {
    const y = newYearInput.trim();
    if (!y) return;
    if (years.includes(y)) {
      alert('Dit jaar bestaat al.');
      return;
    }
    setYears((prev) => [...prev, y].sort().reverse());
    setSelectedYear(y);
    setNewYearInput('');
    setShowAddYear(false);
  };

  const handleAddKlas = () => {
    const k = newKlasInput.trim();
    if (!k) return;
    if (allKlassen.includes(k) || timetables.some((t) => t.klas === k)) {
      alert('Deze klas bestaat al.');
      return;
    }
    setHiddenKlassen((prev) => prev.filter((x) => x !== k));
    setTimetables((prev) => [
      ...prev,
      {
        id: timetableId(selectedYear, k),
        year: selectedYear,
        klas: k,
        slots: {},
      },
    ]);
    setNewKlasInput('');
    setShowAddKlas(false);
  };

  const handleDeleteKlas = async (klas: string) => {
    const hasStudents = klassenFromStudents.includes(klas);
    const hasTimetable = !!getTimetableForKlas(klas);
    const msg = hasStudents
      ? `Klas "${klas}" uit de roosters verwijderen?\n\nHet rooster voor ${selectedYear} wordt gewist. Studenten in deze klas blijven bestaan (beheer via Studenten).`
      : `Klas "${klas}" uit de roosters verwijderen?`;
    if (!confirm(msg)) return;

    setDeletingKlas(klas);
    try {
      await deleteTimetableForKlas(selectedYear, klas);
      setTimetables((prev) => prev.filter((t) => t.klas !== klas));
      setHiddenKlassen((prev) => (prev.includes(klas) ? prev : [...prev, klas]));
      setSeedMsg(`Klas "${klas}" verwijderd uit roosters.`);
    } catch (e) {
      alert('Fout bij verwijderen: ' + (e instanceof Error ? e.message : 'Onbekend'));
    } finally {
      setDeletingKlas(null);
    }
  };

  if (!selectedYear && years.length === 0 && !showAddYear) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="glass-effect rounded-lg p-8 border border-white/20 text-center">
            <h1 className="text-2xl font-bold text-white mb-4">
              Roosters - Docenten koppelen
            </h1>
            <p className="text-white/80 mb-6">
              Koppel docenten aan klassen per dag en lesuur. Voeg eerst een
              schooljaar toe.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => setShowAddYear(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Schooljaar toevoegen
              </button>
              <Link
                href="/"
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20"
              >
                Terug
              </Link>
            </div>
            {showAddYear && (
              <div className="mt-6 flex flex-wrap gap-2 justify-center items-center">
                <input
                  type="text"
                  placeholder="bv. 2025-2026"
                  value={newYearInput}
                  onChange={(e) => setNewYearInput(e.target.value)}
                  className="px-3 py-2 rounded bg-white/10 text-white border border-white/20"
                />
                <button
                  onClick={handleAddYear}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                >
                  Toevoegen
                </button>
                <button
                  onClick={() => setShowAddYear(false)}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg"
                >
                  Annuleren
                </button>
              </div>
            )}
          </div>
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
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="glass-effect rounded-xl shadow-lg p-6 border border-white/20 mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            Roosters - Docenten koppelen
          </h1>
          <p className="text-white/80 mb-4">
            Koppel docenten aan klassen per dag en lesuur. Zo kun je zien bij
            welke docent problemen voorkomen.
          </p>

          {filledSlotsTotal === 0 && (
            <div className="mb-4 rounded-lg border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-sm text-amber-50">
              <strong>Geen docenten ingevuld.</strong> In Rapporten verschijnt dan
              &quot;(Onbekend)&quot; bij alle chill-outs. Klik op &quot;Roosters voor alle
              klassen aanmaken&quot; en vul daarna de docentnamen in (Ma–Vr, lesuur 1–7).
            </div>
          )}

          {seedMsg && (
            <div className="mb-4 rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-50">
              {seedMsg}
            </div>
          )}

          <div className="flex flex-wrap gap-4 items-center mb-4">
            {userIsAdmin && (
              <>
                <button
                  type="button"
                  onClick={handleSeedKlassen}
                  disabled={seeding || !selectedYear || klassenFromStudents.length === 0}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 text-sm font-medium"
                >
                  {seeding ? 'Bezig…' : 'Roosters voor alle klassen aanmaken'}
                </button>
                <button
                  type="button"
                  onClick={handleClearAllTeachers}
                  disabled={clearing || !selectedYear || filledSlotsTotal === 0}
                  className="px-4 py-2 bg-red-600/90 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 text-sm font-medium"
                >
                  {clearing ? 'Bezig…' : 'Alle docentennamen wissen'}
                </button>
              </>
            )}
            <span className="text-white/60 text-sm">
              {klassenFromStudents.length} klassen · {filledSlotsTotal} docent-slots ingevuld
            </span>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <label className="text-white font-medium">Schooljaar:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-2 rounded bg-white/10 text-white border border-white/20"
            >
              {years.map((y) => (
                <option key={y} value={y} className="bg-[#2a2a3a]">
                  {y}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowAddYear(true)}
              className="px-3 py-2 bg-white/10 text-white rounded hover:bg-white/20 text-sm"
            >
              + Nieuw jaar
            </button>
            {showAddYear && (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="bv. 2026-2027"
                  value={newYearInput}
                  onChange={(e) => setNewYearInput(e.target.value)}
                  className="px-3 py-2 rounded bg-white/10 text-white border border-white/20 w-32"
                />
                <button
                  onClick={handleAddYear}
                  className="px-3 py-2 bg-blue-600 text-white rounded text-sm"
                >
                  Toevoegen
                </button>
                <button
                  onClick={() => setShowAddYear(false)}
                  className="px-3 py-2 bg-white/10 text-white rounded text-sm"
                >
                  Annuleren
                </button>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-white">Laden...</div>
        ) : (
          <>
            <div className="flex flex-wrap gap-4 items-center mb-6">
              <button
                onClick={() => setShowAddKlas(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                + Klas toevoegen
              </button>
              {showAddKlas && (
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Klasnaam (bv. 1 Aarde)"
                    value={newKlasInput}
                    onChange={(e) => setNewKlasInput(e.target.value)}
                    className="px-3 py-2 rounded bg-white/10 text-white border border-white/20 min-w-[160px]"
                  />
                  <button
                    onClick={handleAddKlas}
                    className="px-3 py-2 bg-blue-600 text-white rounded"
                  >
                    Toevoegen
                  </button>
                  <button
                    onClick={() => {
                      setShowAddKlas(false);
                      setNewKlasInput('');
                    }}
                    className="px-3 py-2 bg-white/10 text-white rounded"
                  >
                    Annuleren
                  </button>
                </div>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="ml-auto px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>

            <div className="space-y-8">
              {allKlassen.map((klas) => {
                const t = getTimetableForKlas(klas);
                return (
                  <div
                    key={klas}
                    className="glass-effect rounded-lg p-6 border border-white/20 overflow-x-auto"
                  >
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <h2 className="text-xl font-bold text-white">{klas}</h2>
                      <button
                        type="button"
                        onClick={() => handleDeleteKlas(klas)}
                        disabled={deletingKlas === klas}
                        className="px-3 py-1.5 text-sm rounded-lg bg-red-600/80 text-white hover:bg-red-600 disabled:opacity-50 border border-red-400/30"
                        title="Klas uit roosters verwijderen"
                      >
                        {deletingKlas === klas ? 'Bezig…' : 'Klas wissen'}
                      </button>
                    </div>
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr>
                          <th className="border border-white/20 px-2 py-2 text-left text-white font-semibold w-24">
                            Lesuur
                          </th>
                          {DAY_NAMES.map((day, di) => (
                            <th
                              key={day}
                              className="border border-white/20 px-2 py-2 text-center text-white font-semibold min-w-[100px]"
                            >
                              {day}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {HOURS.map((hour) => (
                          <tr key={hour}>
                            <td className="border border-white/20 px-2 py-1 text-white font-medium">
                              {hour}
                            </td>
                            {DAY_NAMES.map((_, di) => (
                              <td
                                key={di}
                                className="border border-white/20 p-1"
                              >
                                <input
                                  type="text"
                                  value={getSlot(t, di, hour)}
                                  onChange={(e) =>
                                    setSlot(klas, di, hour, e.target.value)
                                  }
                                  onKeyDown={(e) =>
                                    handleTimetableSlotKeyDown(e, klas, di, hour)
                                  }
                                  data-timetable-cell=""
                                  data-timetable-klas={klas}
                                  data-timetable-day={di}
                                  data-timetable-hour={hour}
                                  placeholder="Docent"
                                  className="w-full px-2 py-1.5 rounded bg-white/5 text-white border border-white/10 text-xs placeholder-white/40 focus:border-blue-500 focus:outline-none"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>

            {allKlassen.length === 0 && (
              <div className="glass-effect rounded-lg p-8 border border-white/20 text-center text-white/80">
                Geen klassen. Voeg een klas toe of zorg dat er studenten met
                klassen bestaan.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
