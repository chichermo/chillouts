'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { Student, DailyRecord, ChillOutType } from '@/types';
import { loadDailyPageData, saveDailyRecord } from '@/lib/storage';
import {
  formatDate,
  formatDateDisplay,
  calculateDailyTotals,
  normalizeChillOutType,
  parseRecordDate,
  sanitizeStudentEntries,
  sortKlassen,
  splitKlassenIntoBalancedColumns,
} from '@/lib/utils';
import { loadKlassenOrder, saveKlassenOrder } from '@/lib/app-settings';
import { isAdmin } from '@/lib/auth';
import {
  loadTimetables,
  getSchoolYear,
  indexTimetablesByKlas,
} from '@/lib/timetables';
import type { Timetable } from '@/types';
import KlasDailyCard from '@/components/daily/KlasDailyCard';

export default function DailyPage() {
  const params = useParams();
  const dateStr = params.date as string;
  
  const [students, setStudents] = useState<Student[]>([]);
  const [record, setRecord] = useState<DailyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [filterKlas, setFilterKlas] = useState<string>('');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderedKlassen, setOrderedKlassen] = useState<string[]>([]);
  const [klassen, setKlassen] = useState<string[]>([]);
  const [timetableMap, setTimetableMap] = useState<Record<string, Timetable>>({});
  const [saveError, setSaveError] = useState('');
  const pendingRecordRef = useRef<DailyRecord | null>(null);
  const saveInFlightRef = useRef(false);

  const flushSaveQueue = useCallback(async () => {
    if (saveInFlightRef.current) return;
    saveInFlightRef.current = true;

    while (pendingRecordRef.current) {
      const toSave = pendingRecordRef.current;
      pendingRecordRef.current = null;
      try {
        await saveDailyRecord(toSave);
        setSaveError('');
      } catch (err) {
        console.error('Error saving record:', err);
        pendingRecordRef.current = toSave;
        setSaveError(
          'Opslaan mislukt. Controleer je verbinding en probeer opnieuw (wijziging opnieuw aanbrengen).'
        );
        break;
      }
    }

    saveInFlightRef.current = false;
  }, []);

  const queueSave = useCallback(
    (nextRecord: DailyRecord) => {
      pendingRecordRef.current = nextRecord;
      void flushSaveQueue();
    },
    [flushSaveQueue]
  );

  useEffect(() => {
    const loadDataAsync = async () => {
      const { students: allStudents, record: existingRecord } = await loadDailyPageData(dateStr);
      setStudents(allStudents.filter((s) => s.status === 'Actief'));

      if (existingRecord) {
        setRecord(migrateRecord(existingRecord));
      } else {
        const dateObj = new Date(`${dateStr}T12:00:00`);
        const newRecord: DailyRecord = {
          date: dateStr,
          dayName: formatDateDisplay(dateObj).split(' ')[1],
          entries: {},
        };
        setRecord(newRecord);
      }
      setLoading(false);
    };
    loadDataAsync();
  }, [dateStr]);

  // Laad roosters voor docentweergave
  useEffect(() => {
    if (!dateStr || !record) return;
    const dateObj = new Date(dateStr);
    const year = getSchoolYear(dateObj);
    loadTimetables(year)
      .then((timetables) => {
        setTimetableMap(indexTimetablesByKlas(timetables));
      })
      .catch((err) => console.warn('Roosters niet geladen:', err));
  }, [dateStr, record]);

  function migrateRecord(oldRecord: DailyRecord): DailyRecord {
    const entries: DailyRecord['entries'] = {};
    Object.keys(oldRecord.entries).forEach((studentId) => {
      entries[studentId] = sanitizeStudentEntries(
        oldRecord.entries[studentId] as Record<string | number, unknown>
      );
    });
    return { ...oldRecord, entries };
  }

  const handleCheckboxChange = (studentId: string, hour: number, type: ChillOutType, targetCount: number, checked: boolean) => {
    if (!record || isReadOnlyPast) return;

    const updatedRecord = { ...record };
    if (!updatedRecord.entries[studentId]) {
      updatedRecord.entries[studentId] = {};
    }
    if (!updatedRecord.entries[studentId][hour]) {
      updatedRecord.entries[studentId][hour] = [];
    }

    const currentEntries = [...updatedRecord.entries[studentId][hour]];
    const typeEntries = currentEntries.filter(
      (e) => normalizeChillOutType(e?.type) === type
    );
    const otherEntries = currentEntries.filter(
      (e) => normalizeChillOutType(e?.type) !== type
    );
    const currentTypeCount = typeEntries.length;
    
    // Tel andere typen (exclusief huidig type)
    const otherTypesCount = otherEntries.length;

    if (checked) {
      // Voeg chill-outs toe tot targetCount bereikt is
      // Controleer dat het maximum totaal van 3 niet wordt overschreden
      const newTotal = targetCount + otherTypesCount;
      if (newTotal <= 3) {
        // Voeg ontbrekende toe
        const toAdd = targetCount - currentTypeCount;
        for (let i = 0; i < toAdd; i++) {
          typeEntries.push({ count: 1, type });
        }
      }
    } else {
      // Verwijder chill-outs vanaf targetCount naar beneden
      const toRemove = currentTypeCount - targetCount;
      for (let i = 0; i < toRemove; i++) {
        typeEntries.pop();
      }
    }

    // Herbouw de array: eerst die van het type, dan de anderen
    updatedRecord.entries[studentId][hour] = [...typeEntries, ...otherEntries];
    setRecord(updatedRecord);
    queueSave(updatedRecord);
  };

  const getChillOutCount = (studentId: string, hour: number, type: ChillOutType): number => {
    if (!record || !record.entries[studentId] || !record.entries[studentId][hour]) {
      return 0;
    }
    return record.entries[studentId][hour].filter(
      (e) => normalizeChillOutType(e?.type) === type
    ).length;
  };

  const getGenericChillOutCount = (studentId: string, hour: number): number => {
    if (!record || !record.entries[studentId] || !record.entries[studentId][hour]) {
      return 0;
    }
    return record.entries[studentId][hour].filter(
      (e) => normalizeChillOutType(e?.type) === null
    ).length;
  };

  const getTotalChillOuts = (studentId: string, hour: number): number => {
    if (!record || !record.entries[studentId] || !record.entries[studentId][hour]) {
      return 0;
    }
    return record.entries[studentId][hour].length;
  };

  const calculateTotals = () => {
    if (!record) return { totals: {}, vr: {}, vl: {} };
    return calculateDailyTotals(record, students);
  };

  // Calculate klassen with useMemo to ensure stable reference
  const uniqueKlassen = useMemo(() => [...new Set(students.map((s) => s.klas))], [students]);

  useEffect(() => {
    if (uniqueKlassen.length === 0) {
      setKlassen([]);
      return;
    }
    loadKlassenOrder(uniqueKlassen)
      .then(async (ordered) => {
        setKlassen(ordered);
        try {
          await saveKlassenOrder(ordered);
        } catch {
          // Weergave is al correct; opslaan van de volgorde is optioneel
        }
      })
      .catch(() => setKlassen(sortKlassen(uniqueKlassen)));
  }, [uniqueKlassen]);
  
  // Initialize ordered klassen for modal
  useEffect(() => {
    if (showOrderModal && orderedKlassen.length === 0 && klassen.length > 0) {
      setOrderedKlassen([...klassen]);
    }
  }, [showOrderModal, orderedKlassen.length, klassen]);

  const filteredKlassen = useMemo(
    () => (filterKlas ? klassen.filter((k) => k === filterKlas) : klassen),
    [filterKlas, klassen]
  );

  const { left: leftKlassen, right: rightKlassen } = useMemo(
    () => splitKlassenIntoBalancedColumns(filteredKlassen),
    [filteredKlassen]
  );

  if (loading) {
    return <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      <Navigation />
      <div className="text-xl text-white">Laden...</div>
    </div>;
  }

  if (!record) return null;

  const totals = calculateTotals();
  
  const handleMoveKlas = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...orderedKlassen];
    if (direction === 'up' && index > 0) {
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    } else if (direction === 'down' && index < newOrder.length - 1) {
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    }
    setOrderedKlassen(newOrder);
  };
  
  const handleSaveOrder = async () => {
    try {
      await saveKlassenOrder(orderedKlassen);
      setKlassen(orderedKlassen);
      setShowOrderModal(false);
    } catch (e) {
      alert('Fout bij opslaan volgorde: ' + (e instanceof Error ? e.message : 'Onbekend'));
    }
  };

  const handleResetOrder = async () => {
    const defaultOrder = sortKlassen(uniqueKlassen);
    setOrderedKlassen(defaultOrder);
    try {
      await saveKlassenOrder(defaultOrder);
      setKlassen(defaultOrder);
    } catch (e) {
      alert('Fout bij resetten: ' + (e instanceof Error ? e.message : 'Onbekend'));
    }
  };

  const dateObj = parseRecordDate(dateStr) ?? new Date(`${dateStr}T12:00:00`);
  const displayDate = formatDateDisplay(dateObj);
  const todayLocal = new Date().toLocaleDateString('sv-SE');
  const isPastDate = dateStr < todayLocal;
  const isReadOnlyPast = isPastDate && !isAdmin();

  // Datumnavigatie
  const navigateDate = (days: number) => {
    const newDate = new Date(dateObj);
    newDate.setDate(newDate.getDate() + days);
    window.location.href = `/daily/${formatDate(newDate)}`;
  };

  const klasCardProps = {
    students,
    dateStr,
    timetableMap,
    selectedHour,
    isReadOnlyPast,
    onHourHover: setSelectedHour,
    getChillOutCount,
    getGenericChillOutCount,
    getTotalChillOuts,
    onCheckboxChange: handleCheckboxChange,
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
      </div>
      <Navigation />
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header met navigatie */}
        <div className="mb-6 glass-effect rounded-xl shadow-lg p-6 border border-white/20">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
                {displayDate}
              </h1>
              <p className="text-white/90">Registreer chill-outs voor deze dag</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateDate(-1)}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors text-white"
              >
                Vorige
              </button>
              <button
                onClick={() => navigateDate(1)}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors text-white"
              >
                Volgende
              </button>
              <Link
                href="/daily"
                className="px-4 py-2 bg-white text-blue-900 hover:bg-white/90 rounded-lg font-medium transition-colors"
              >
                Overzicht
              </Link>
            </div>
          </div>

          {isReadOnlyPast && (
            <div className="mt-4 rounded-lg border border-amber-300/40 bg-amber-400/15 px-4 py-3 text-amber-100 text-sm">
              Deze datum is alleen-lezen voor niet-admin gebruikers. Alleen admins kunnen vorige dagen bewerken.
            </div>
          )}

          {saveError && (
            <div className="mt-4 rounded-lg border border-red-400/40 bg-red-500/15 px-4 py-3 text-red-100 text-sm">
              {saveError}
            </div>
          )}
          
          {/* Filter op klas en sorteren */}
          {klassen.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/20 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-white/90">Filter op klas:</label>
                <select
                  value={filterKlas}
                  onChange={(e) => setFilterKlas(e.target.value)}
                  className="px-4 py-2 bg-white/10 border-2 border-white/20 rounded-lg text-white focus:border-white/50 focus:outline-none transition-colors"
                >
                  <option value="" className="bg-blue-900">Alle klassen</option>
                  {klassen.map(klas => (
                    <option key={klas} value={klas} className="bg-blue-900">{klas}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  setOrderedKlassen([...klassen]);
                  setShowOrderModal(true);
                }}
                className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2"
                title="Sorteren klassen"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Sorteren Klassen
              </button>
            </div>
          )}
        </div>

        {/* Totalen per lesuur */}
        <div className="glass-effect p-6 rounded-xl shadow-lg mb-6 border border-white/20">
          <h2 className="text-2xl font-semibold mb-4 text-white">TOTAAL PER LESUUR</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-white/10">
                  <th className="border-2 border-white/20 p-3 font-semibold text-white"></th>
                  {[1, 2, 3, 4, 5, 6, 7].map(hour => (
                    <th key={hour} className="border-2 border-white/20 p-3 text-center font-semibold text-white">{hour}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white/10 font-semibold">
                  <td className="border-2 border-white/20 p-3 text-white">Chill-outs</td>
                  {[1, 2, 3, 4, 5, 6, 7].map(hour => (
                    <td key={hour} className="border-2 border-white/20 p-3 text-center text-lg text-white">
                      {totals.totals[hour] || 0}
                    </td>
                  ))}
                </tr>
                <tr className="bg-brand-blue/20">
                  <td className="border-2 border-white/20 p-3 font-medium text-white">VR</td>
                  {[1, 2, 3, 4, 5, 6, 7].map(hour => (
                    <td key={hour} className="border-2 border-white/20 p-3 text-center text-lg font-semibold text-blue-200">
                      {totals.vr[hour] || 0}
                    </td>
                  ))}
                </tr>
                <tr className="bg-brand-green/20">
                  <td className="border-2 border-white/20 p-3 font-medium text-white">VL</td>
                  {[1, 2, 3, 4, 5, 6, 7].map(hour => (
                    <td key={hour} className="border-2 border-white/20 p-3 text-center text-lg font-semibold text-emerald-200">
                      {totals.vl[hour] || 0}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Registratie per klas — kolom 2: 3 MovePlay, 4 Art, 4 Business */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="flex flex-col gap-6 min-w-0">
            {leftKlassen.map((klas) => (
              <KlasDailyCard key={klas} klas={klas} {...klasCardProps} />
            ))}
          </div>
          <div className="flex flex-col gap-6 min-w-0">
            {rightKlassen.map((klas) => (
              <KlasDailyCard key={klas} klas={klas} {...klasCardProps} />
            ))}
          </div>
        </div>
      </div>
      
      {/* Modal om klassen te sorteren */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-effect rounded-xl p-6 border border-white/20 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Sorteren Klassen</h2>
              <button
                onClick={() => setShowOrderModal(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-white/70 text-sm mb-4">
              Gebruik de pijltjes om de volgorde van klassen aan te passen. De volgorde wordt gebruikt in de dagelijkse weergave.
            </p>
            
            <div className="space-y-2 mb-6">
              {orderedKlassen.map((klas, index) => (
                <div
                  key={klas}
                  className="flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/10"
                >
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => handleMoveKlas(index, 'up')}
                      disabled={index === 0}
                      className="p-1 text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Omhoog"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleMoveKlas(index, 'down')}
                      disabled={index === orderedKlassen.length - 1}
                      className="p-1 text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Omlaag"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex-1 text-white font-medium">{klas}</div>
                  <div className="text-white/50 text-sm">#{index + 1}</div>
                </div>
              ))}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleSaveOrder}
                className="flex-1 px-4 py-2 bg-brand-green hover:bg-emerald-600 text-white rounded-lg font-semibold transition-colors"
              >
                Opslaan
              </button>
              <button
                onClick={handleResetOrder}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg font-medium transition-colors"
              >
                Reset naar Standaard
              </button>
              <button
                onClick={() => setShowOrderModal(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg font-medium transition-colors"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
