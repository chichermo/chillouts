'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { Student, DailyRecord, ChillOutType } from '@/types';
import { loadData, saveDailyRecord, getDailyRecord } from '@/lib/storage';
import { formatDate, formatDateDisplay, calculateDailyTotals, sortKlassen, getCustomKlassenOrder, saveCustomKlassenOrder } from '@/lib/utils';

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

  useEffect(() => {
    const loadDataAsync = async () => {
      const data = await loadData();
      setStudents(data.students.filter(s => s.status === 'Actief'));
      
      const existingRecord = await getDailyRecord(dateStr);
      if (existingRecord) {
        // Migreer oude gegevens naar nieuw formaat indien nodig
        const migratedRecord = migrateRecord(existingRecord);
        setRecord(migratedRecord);
      } else {
        // Maak nieuw record aan
        const dateObj = new Date(dateStr);
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

  // Migreer oude records naar nieuw formaat
  function migrateRecord(oldRecord: DailyRecord): DailyRecord {
    const newRecord: DailyRecord = {
      ...oldRecord,
      entries: {},
    };

    Object.keys(oldRecord.entries).forEach(studentId => {
      newRecord.entries[studentId] = {};
      Object.keys(oldRecord.entries[studentId]).forEach(hourStr => {
        const hour = parseInt(hourStr);
        const oldEntry = oldRecord.entries[studentId][hour];
        
        // Si es el formato antiguo (objeto), convertir a array
        if (oldEntry && !Array.isArray(oldEntry)) {
          const oldEntryObj = oldEntry as { count: number; type: ChillOutType | null };
          const entries: { count: number; type: ChillOutType | null }[] = [];
          for (let i = 0; i < oldEntryObj.count; i++) {
            entries.push({ count: 1, type: oldEntryObj.type });
          }
          newRecord.entries[studentId][hour] = entries;
        } else if (Array.isArray(oldEntry)) {
          newRecord.entries[studentId][hour] = oldEntry;
        } else {
          newRecord.entries[studentId][hour] = [];
        }
      });
    });

    return newRecord;
  }

  const handleCheckboxChange = (studentId: string, hour: number, type: ChillOutType, targetCount: number, checked: boolean) => {
    if (!record) return;

    const updatedRecord = { ...record };
    if (!updatedRecord.entries[studentId]) {
      updatedRecord.entries[studentId] = {};
    }
    if (!updatedRecord.entries[studentId][hour]) {
      updatedRecord.entries[studentId][hour] = [];
    }

    const currentEntries = [...updatedRecord.entries[studentId][hour]];
    const typeEntries = currentEntries.filter(e => e.type === type);
    const otherEntries = currentEntries.filter(e => e.type !== type);
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
    saveDailyRecord(updatedRecord).catch(err => console.error('Error saving record:', err));
  };

  const getChillOutCount = (studentId: string, hour: number, type: ChillOutType): number => {
    if (!record || !record.entries[studentId] || !record.entries[studentId][hour]) {
      return 0;
    }
    return record.entries[studentId][hour].filter(e => e.type === type).length;
  };

  const getGenericChillOutCount = (studentId: string, hour: number): number => {
    if (!record || !record.entries[studentId] || !record.entries[studentId][hour]) {
      return 0;
    }
    return record.entries[studentId][hour].filter(e => e.type === null).length;
  };

  const getTotalChillOuts = (studentId: string, hour: number): number => {
    if (!record || !record.entries[studentId] || !record.entries[studentId][hour]) {
      return 0;
    }
    return record.entries[studentId][hour].length;
  };

  // Herbereken totalen met het nieuwe formaat
  const calculateTotals = () => {
    if (!record) {
      return { totals: {}, vr: {}, vl: {} };
    }

    const totals: { [hour: number]: number } = {};
    const vr: { [hour: number]: number } = {};
    const vl: { [hour: number]: number } = {};

    // Initialiseer lesuren 1-7
    for (let hour = 1; hour <= 7; hour++) {
      totals[hour] = 0;
      vr[hour] = 0;
      vl[hour] = 0;
    }

    // Bereken totalen per lesuur
    Object.keys(record.entries).forEach(studentId => {
      const studentEntries = record.entries[studentId];
      Object.keys(studentEntries).forEach(hourStr => {
        const hour = parseInt(hourStr);
        const entries = studentEntries[hour] || [];
        
        entries.forEach(entry => {
          if (entry) {
            totals[hour] = (totals[hour] || 0) + 1;
            if (entry.type === 'VR') {
              vr[hour] = (vr[hour] || 0) + 1;
            } else if (entry.type === 'VL') {
              vl[hour] = (vl[hour] || 0) + 1;
            }
            // Generieke chill-outs (type === null) worden geteld in totals maar niet in VR/VL
          }
        });
      });
    });

    return { totals, vr, vl };
  };

  if (loading) {
    return <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      <Navigation />
      <div className="text-xl text-white">Laden...</div>
    </div>;
  }

  if (!record) return null;

  const totals = calculateTotals();
  const uniqueKlassen = [...new Set(students.map(s => s.klas))];
  const klassen = getCustomKlassenOrder(uniqueKlassen);
  
  // Initialize ordered klassen for modal
  useEffect(() => {
    if (showOrderModal && orderedKlassen.length === 0) {
      setOrderedKlassen([...klassen]);
    }
  }, [showOrderModal, klassen, orderedKlassen.length]);
  
  // Verdeel klassen in twee groepen om naast elkaar te tonen
  const midPoint = Math.ceil(klassen.length / 2);
  const leftKlassen = klassen.slice(0, midPoint);
  const rightKlassen = klassen.slice(midPoint);
  
  const handleMoveKlas = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...orderedKlassen];
    if (direction === 'up' && index > 0) {
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    } else if (direction === 'down' && index < newOrder.length - 1) {
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    }
    setOrderedKlassen(newOrder);
  };
  
  const handleSaveOrder = () => {
    saveCustomKlassenOrder(orderedKlassen);
    setShowOrderModal(false);
    // Force reload to apply new order
    window.location.reload();
  };
  
  const handleResetOrder = () => {
    const defaultOrder = sortKlassen(uniqueKlassen);
    setOrderedKlassen(defaultOrder);
    saveCustomKlassenOrder(defaultOrder);
  };

  const dateObj = new Date(dateStr);
  const displayDate = formatDateDisplay(dateObj);

  // Datumnavigatie
  const navigateDate = (days: number) => {
    const newDate = new Date(dateObj);
    newDate.setDate(newDate.getDate() + days);
    window.location.href = `/daily/${formatDate(newDate)}`;
  };

  const filteredKlassen = filterKlas 
    ? klassen.filter(k => k === filterKlas)
    : klassen;

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
                ← Vorige
              </button>
              <button
                onClick={() => navigateDate(1)}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors text-white"
              >
                Volgende →
              </button>
              <Link
                href="/daily"
                className="px-4 py-2 bg-white text-blue-900 hover:bg-white/90 rounded-lg font-medium transition-colors"
              >
                Overzicht
              </Link>
            </div>
          </div>
          
          {/* Filter per klas y ordenar */}
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
                onClick={() => setShowOrderModal(true)}
                className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2"
                title="Ordenar klassen"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Ordenar Klassen
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

        {/* Registratie per klas - Twee kolommen */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Columna izquierda */}
          <div>
            {filteredKlassen.slice(0, Math.ceil(filteredKlassen.length / 2)).map(klas => {
              const klasStudents = students.filter(s => s.klas === klas);
              return (
                <div key={klas} className="glass-effect p-6 rounded-xl shadow-lg mb-6 border border-white/20">
                  <h3 className="text-xl font-semibold mb-4 text-yellow-200 bg-gradient-to-r from-yellow-500/20 to-yellow-400/20 p-3 rounded-lg border-l-4 border-yellow-400/50">
                    {klas}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-white/10">
                          <th className="border border-white/20 px-2 py-1 text-left font-semibold text-xs text-white">Naam?</th>
                          {[1, 2, 3, 4, 5, 6, 7].map(hour => (
                            <th key={hour} className="border border-white/20 px-1 py-1 text-center font-semibold text-xs text-white">{hour}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {klasStudents.map(student => (
                          <tr key={student.id} className="hover:bg-white/10 transition-colors">
                            <td className="border border-white/20 px-2 py-1 font-medium text-xs text-white">{student.name}</td>
                            {[1, 2, 3, 4, 5, 6, 7].map(hour => {
                              const vrCount = getChillOutCount(student.id, hour, 'VR');
                              const vlCount = getChillOutCount(student.id, hour, 'VL');
                              const total = getTotalChillOuts(student.id, hour);
                              const maxReached = total >= 3;

                              return (
                                <td 
                                  key={hour} 
                                  className={`border border-white/20 px-0.5 py-0.5 transition-all ${
                                    selectedHour === hour ? 'bg-white/10 border-blue-400/50' : 'hover:bg-white/10'
                                  }`}
                                  onMouseEnter={() => setSelectedHour(hour)}
                                  onMouseLeave={() => setSelectedHour(null)}
                                >
                                  <div className="flex flex-col gap-0.5 items-center py-1">
                                    {/* Compacte checkboxes in één rij met labels */}
                                    <div className="flex flex-col gap-0.5">
                                      {/* VR rij - Maximum 1 VR per student per lesuur */}
                                      <div className="flex items-center gap-0.5 justify-center">
                                        <span className="text-[9px] font-semibold text-blue-200 w-4 text-right">VR</span>
                                        {[1].map(count => {
                                          const isChecked = vrCount >= count;
                                          const vlCountCurrent = getChillOutCount(student.id, hour, 'VL');
                                          const genericCount = getGenericChillOutCount(student.id, hour);
                                          // Maximum 3 totalen: 1 VR + VL + generieke chill-outs
                                          const canCheck = (count + vlCountCurrent + genericCount) <= 3;
                                          return (
                                            <label 
                                              key={`vr-${count}`} 
                                              className={`flex items-center cursor-pointer ${isChecked ? 'opacity-100' : 'opacity-40'}`}
                                              title={`VR ${count}`}
                                            >
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => handleCheckboxChange(student.id, hour, 'VR', e.target.checked ? count : count - 1, e.target.checked)}
                                                disabled={!canCheck && !isChecked}
                                                className="w-3 h-3 text-blue-600 border border-gray-400 rounded focus:ring-1 focus:ring-blue-500 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                                              />
                                            </label>
                                          );
                                        })}
                                      </div>
                                      
                                      {/* VL rij - Maximum 1 VL per student per lesuur */}
                                      <div className="flex items-center gap-0.5 justify-center">
                                        <span className="text-[9px] font-semibold text-emerald-200 w-4 text-right">VL</span>
                                        {[1].map(count => {
                                          const isChecked = vlCount >= count;
                                          const vrCountCurrent = getChillOutCount(student.id, hour, 'VR');
                                          const genericCount = getGenericChillOutCount(student.id, hour);
                                          // Maximum 3 totalen: VR + 1 VL + generieke chill-outs
                                          const canCheck = (count + vrCountCurrent + genericCount) <= 3;
                                          return (
                                            <label 
                                              key={`vl-${count}`} 
                                              className={`flex items-center cursor-pointer ${isChecked ? 'opacity-100' : 'opacity-40'}`}
                                              title={`VL ${count}`}
                                            >
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => handleCheckboxChange(student.id, hour, 'VL', e.target.checked ? count : count - 1, e.target.checked)}
                                                disabled={!canCheck && !isChecked}
                                                className="w-3 h-3 text-green-600 border border-gray-400 rounded focus:ring-1 focus:ring-green-500 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                                              />
                                            </label>
                                          );
                                        })}
                                      </div>
                                      
                                      {/* Generieke chill-outs rij - Tot 3 mogelijk, maar respecteer maximum totaal van 3 */}
                                      <div className="flex items-center gap-0.5 justify-center">
                                        <span className="text-[9px] font-semibold text-white/85 w-4 text-right">CO</span>
                                        {[1, 2, 3].map(count => {
                                          const genericCount = getGenericChillOutCount(student.id, hour);
                                          const isChecked = genericCount >= count;
                                          const vrCountCurrent = getChillOutCount(student.id, hour, 'VR');
                                          const vlCountCurrent = getChillOutCount(student.id, hour, 'VL');
                                          // Maximum 3 totalen: VR + VL + generieke chill-outs
                                          const canCheck = (count + vrCountCurrent + vlCountCurrent) <= 3;
                                          return (
                                            <label 
                                              key={`gen-${count}`} 
                                              className={`flex items-center cursor-pointer ${isChecked ? 'opacity-100' : 'opacity-40'}`}
                                              title={`Chill-out ${count}`}
                                            >
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => handleCheckboxChange(student.id, hour, null, e.target.checked ? count : count - 1, e.target.checked)}
                                                disabled={!canCheck && !isChecked}
                                                className="w-3 h-3 text-gray-600 border border-gray-400 rounded focus:ring-1 focus:ring-gray-500 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                                              />
                                            </label>
                                          );
                                        })}
                                      </div>
                                    </div>
                                    
                                    {/* Compacte totaalteller */}
                                    {total > 0 && (
                                      <span className={`text-[9px] font-bold px-1 py-0 rounded ${
                                        total >= 3 
                                          ? 'bg-red-500/30 text-red-200' 
                                          : total >= 2
                                          ? 'bg-yellow-500/30 text-yellow-200'
                                          : 'bg-white/20 text-white/90'
                                      }`}>
                                        {total}/3
                                      </span>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Columna derecha */}
          <div>
            {filteredKlassen.slice(Math.ceil(filteredKlassen.length / 2)).map(klas => {
              const klasStudents = students.filter(s => s.klas === klas);
              return (
                <div key={klas} className="glass-effect p-6 rounded-xl shadow-lg mb-6 border border-white/20">
                  <h3 className="text-xl font-semibold mb-4 text-yellow-200 bg-gradient-to-r from-yellow-500/20 to-yellow-400/20 p-3 rounded-lg border-l-4 border-yellow-400/50">
                    {klas}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-white/10">
                          <th className="border border-white/20 px-2 py-1 text-left font-semibold text-xs text-white">Naam?</th>
                          {[1, 2, 3, 4, 5, 6, 7].map(hour => (
                            <th key={hour} className="border border-white/20 px-1 py-1 text-center font-semibold text-xs text-white">{hour}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {klasStudents.map(student => (
                          <tr key={student.id} className="hover:bg-white/10 transition-colors">
                            <td className="border border-white/20 px-2 py-1 font-medium text-xs text-white">{student.name}</td>
                            {[1, 2, 3, 4, 5, 6, 7].map(hour => {
                              const vrCount = getChillOutCount(student.id, hour, 'VR');
                              const vlCount = getChillOutCount(student.id, hour, 'VL');
                              const total = getTotalChillOuts(student.id, hour);
                              const maxReached = total >= 3;

                              return (
                                <td 
                                  key={hour} 
                                  className={`border border-white/20 px-0.5 py-0.5 transition-all ${
                                    selectedHour === hour ? 'bg-white/10 border-blue-400/50' : 'hover:bg-white/10'
                                  }`}
                                  onMouseEnter={() => setSelectedHour(hour)}
                                  onMouseLeave={() => setSelectedHour(null)}
                                >
                                  <div className="flex flex-col gap-0.5 items-center py-1">
                                    {/* Compacte checkboxes in één rij met labels */}
                                    <div className="flex flex-col gap-0.5">
                                      {/* VR rij - Maximum 1 VR per student per lesuur */}
                                      <div className="flex items-center gap-0.5 justify-center">
                                        <span className="text-[9px] font-semibold text-blue-200 w-4 text-right">VR</span>
                                        {[1].map(count => {
                                          const isChecked = vrCount >= count;
                                          const vlCountCurrent = getChillOutCount(student.id, hour, 'VL');
                                          const genericCount = getGenericChillOutCount(student.id, hour);
                                          // Maximum 3 totalen: 1 VR + VL + generieke chill-outs
                                          const canCheck = (count + vlCountCurrent + genericCount) <= 3;
                                          return (
                                            <label 
                                              key={`vr-${count}`} 
                                              className={`flex items-center cursor-pointer ${isChecked ? 'opacity-100' : 'opacity-40'}`}
                                              title={`VR ${count}`}
                                            >
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => handleCheckboxChange(student.id, hour, 'VR', e.target.checked ? count : count - 1, e.target.checked)}
                                                disabled={!canCheck && !isChecked}
                                                className="w-3 h-3 text-blue-600 border border-gray-400 rounded focus:ring-1 focus:ring-blue-500 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                                              />
                                            </label>
                                          );
                                        })}
                                      </div>
                                      
                                      {/* VL rij - Maximum 1 VL per student per lesuur */}
                                      <div className="flex items-center gap-0.5 justify-center">
                                        <span className="text-[9px] font-semibold text-emerald-200 w-4 text-right">VL</span>
                                        {[1].map(count => {
                                          const isChecked = vlCount >= count;
                                          const vrCountCurrent = getChillOutCount(student.id, hour, 'VR');
                                          const genericCount = getGenericChillOutCount(student.id, hour);
                                          // Maximum 3 totalen: VR + 1 VL + generieke chill-outs
                                          const canCheck = (count + vrCountCurrent + genericCount) <= 3;
                                          return (
                                            <label 
                                              key={`vl-${count}`} 
                                              className={`flex items-center cursor-pointer ${isChecked ? 'opacity-100' : 'opacity-40'}`}
                                              title={`VL ${count}`}
                                            >
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => handleCheckboxChange(student.id, hour, 'VL', e.target.checked ? count : count - 1, e.target.checked)}
                                                disabled={!canCheck && !isChecked}
                                                className="w-3 h-3 text-green-600 border border-gray-400 rounded focus:ring-1 focus:ring-green-500 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                                              />
                                            </label>
                                          );
                                        })}
                                      </div>
                                      
                                      {/* Generieke chill-outs rij - Tot 3 mogelijk, maar respecteer maximum totaal van 3 */}
                                      <div className="flex items-center gap-0.5 justify-center">
                                        <span className="text-[9px] font-semibold text-white/85 w-4 text-right">CO</span>
                                        {[1, 2, 3].map(count => {
                                          const genericCount = getGenericChillOutCount(student.id, hour);
                                          const isChecked = genericCount >= count;
                                          const vrCountCurrent = getChillOutCount(student.id, hour, 'VR');
                                          const vlCountCurrent = getChillOutCount(student.id, hour, 'VL');
                                          // Maximum 3 totalen: VR + VL + generieke chill-outs
                                          const canCheck = (count + vrCountCurrent + vlCountCurrent) <= 3;
                                          return (
                                            <label 
                                              key={`gen-${count}`} 
                                              className={`flex items-center cursor-pointer ${isChecked ? 'opacity-100' : 'opacity-40'}`}
                                              title={`Chill-out ${count}`}
                                            >
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => handleCheckboxChange(student.id, hour, null, e.target.checked ? count : count - 1, e.target.checked)}
                                                disabled={!canCheck && !isChecked}
                                                className="w-3 h-3 text-gray-600 border border-gray-400 rounded focus:ring-1 focus:ring-gray-500 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                                              />
                                            </label>
                                          );
                                        })}
                                      </div>
                                    </div>
                                    
                                    {/* Compacte totaalteller */}
                                    {total > 0 && (
                                      <span className={`text-[9px] font-bold px-1 py-0 rounded ${
                                        total >= 3 
                                          ? 'bg-red-500/30 text-red-200' 
                                          : total >= 2
                                          ? 'bg-yellow-500/30 text-yellow-200'
                                          : 'bg-white/20 text-white/90'
                                      }`}>
                                        {total}/3
                                      </span>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Modal para ordenar klassen */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-effect rounded-xl p-6 border border-white/20 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Ordenar Klassen</h2>
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
