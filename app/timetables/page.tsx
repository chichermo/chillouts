'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { loadData } from '@/lib/storage';
import {
  loadTimetables,
  saveTimetable,
  getTimetableYears,
  timetableId,
  DAY_NAMES,
  HOURS,
  slotKey,
} from '@/lib/timetables';
import type { Timetable, TimetableSlots } from '@/types';
import { sortKlassen } from '@/lib/utils';

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

  useEffect(() => {
    const load = async () => {
      const data = await loadData();
      const klassen = sortKlassen([...new Set(data.students.map((s) => s.klas))]);
      setKlassenFromStudents(klassen);

      try {
        const y = await getTimetableYears();
        setYears(y);
        if (y.length > 0) {
          setSelectedYear((prev) => prev || y[0]);
        } else {
          const current = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
          setYears([current]);
          setSelectedYear(current);
        }
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
      setLoading(false);
      return;
    }
    setLoading(true);
    loadTimetables(selectedYear).then((t) => {
      setTimetables(t);
      setLoading(false);
    });
  }, [selectedYear]);

  const allKlassen = [
    ...new Set([...klassenFromStudents, ...timetables.map((t) => t.klas)]),
  ].sort();

  const getTimetableForKlas = (klas: string): Timetable | undefined =>
    timetables.find((t) => t.klas === klas);

  const getSlot = (t: Timetable | undefined, dayIndex: number, hour: number): string =>
    t?.slots[slotKey(dayIndex, hour)] ?? '';

  const setSlot = (
    klas: string,
    dayIndex: number,
    hour: number,
    value: string
  ) => {
    const existing = getTimetableForKlas(klas);
    const slots: TimetableSlots = { ...(existing?.slots || {}) };
    const key = slotKey(dayIndex, hour);
    if (value.trim()) {
      slots[key] = value.trim();
    } else {
      delete slots[key];
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

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const t of timetables) {
        await saveTimetable(t);
      }
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
    if (allKlassen.includes(k)) {
      alert('Deze klas bestaat al.');
      return;
    }
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
                    <h2 className="text-xl font-bold text-white mb-4">{klas}</h2>
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
