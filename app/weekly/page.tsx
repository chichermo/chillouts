'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { WeeklyTotal } from '@/types';
import { loadData } from '@/lib/storage';
import { getWeekNumber, getWeekStartDate, formatDate, calculateWeeklyTotals } from '@/lib/utils';

export default function WeeklyPage() {
  const [selectedWeek, setSelectedWeek] = useState<number>(0);
  const [weeklyTotal, setWeeklyTotal] = useState<WeeklyTotal | null>(null);
  const [klassen, setKlassen] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const loadDataAsync = async () => {
      const data = await loadData();
      const allKlassen = [...new Set(data.students.map(s => s.klas))].sort();
      setKlassen(allKlassen);

      // Obtener semana actual
      const today = new Date();
      const currentWeek = getWeekNumber(today);
      setSelectedWeek(currentWeek);
      
      // Calcular totales de la semana actual
      const weekStart = getWeekStartDate(today);
      const totals = calculateWeeklyTotals(currentWeek, weekStart, data.dailyRecords, data.students);
      setWeeklyTotal(totals);
    };
    loadDataAsync();
  }, []);

  const handleWeekChange = async (weekNumber: number) => {
    setSelectedWeek(weekNumber);
    const data = await loadData();
    
    // Calcular fecha de inicio de la semana
    const today = new Date();
    const currentWeek = getWeekNumber(today);
    const weekDiff = weekNumber - currentWeek;
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + (weekDiff * 7));
    const weekStart = getWeekStartDate(targetDate);
    
    const totals = calculateWeeklyTotals(weekNumber, weekStart, data.dailyRecords, data.students);
    setWeeklyTotal(totals);
  };

  const weekDays = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag'];
  const today = new Date();
  const currentWeek = getWeekNumber(today);
  const weeks = Array.from({ length: 20 }, (_, i) => currentWeek - 10 + i);

  if (!mounted || !weeklyTotal) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <Navigation />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-xl text-white">Laden...</div>
        </div>
      </div>
    );
  }

  // Calcular totales por clase
  const klasTotals: { [klas: string]: { total: number; vr: number; vl: number; avg: number } } = {};
  klassen.forEach(klas => {
    let total = 0;
    let vr = 0;
    let vl = 0;
    
    weekDays.forEach(day => {
      const dayData = weeklyTotal.totals[klas]?.[day] || { total: 0, vr: 0, vl: 0 };
      total += dayData.total;
      vr += dayData.vr;
      vl += dayData.vl;
    });
    
    klasTotals[klas] = {
      total,
      vr,
      vl,
      avg: total / 5,
    };
  });

  // Total general de la semana
  const weekTotal = Object.values(klasTotals).reduce((acc, k) => ({
    total: acc.total + k.total,
    vr: acc.vr + k.vr,
    vl: acc.vl + k.vl,
  }), { total: 0, vr: 0, vl: 0 });

  const weekStartDate = getWeekStartDate(new Date());
  weekStartDate.setDate(weekStartDate.getDate() + ((selectedWeek - currentWeek) * 7));
  const weekStartStr = formatDate(weekStartDate);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
      </div>
      <Navigation />
      <div className="container mx-auto px-4 py-6 relative z-10">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-white">Weekoverzicht</h1>
        </div>

        {/* Selector de semana */}
        <div className="glass-effect p-4 rounded-lg shadow-md mb-4 border border-white/30">
          <label className="block mb-2 text-sm text-white/90 font-medium">
            Selecteer Week:
          </label>
          <select
            value={selectedWeek}
            onChange={(e) => handleWeekChange(parseInt(e.target.value))}
            className="px-3 py-2 text-sm bg-white/10 border border-white/30 rounded-md w-full md:w-auto text-white focus:border-white/50 focus:ring-1 focus:ring-white/50 focus:outline-none"
          >
            {weeks.map(week => (
              <option key={week} value={week} className="bg-blue-900">
                Week {week} {week === currentWeek ? '(Huidige week)' : ''}
              </option>
            ))}
          </select>
          <p className="mt-2 text-sm text-white/80">
            Week {selectedWeek} ({weekStartStr})
          </p>
        </div>

        {/* Tabla de totales */}
        <div className="glass-effect p-4 rounded-lg shadow-md overflow-x-auto border border-white/30">
          <h2 className="text-lg font-semibold mb-3 text-white">
            TOTALEN PER KLAS - Week {selectedWeek}
          </h2>
          
          <table className="w-full border-collapse min-w-[800px] text-sm">
            <thead>
              <tr className="bg-white/10">
                <th className="border border-white/30 px-2 py-2 text-left font-semibold text-white">Klas</th>
                {weekDays.map(day => (
                  <th key={day} className="border border-white/30 px-2 py-2 text-center font-semibold text-xs text-white">{day}</th>
                ))}
                <th className="border border-white/30 px-2 py-2 text-center font-semibold text-white">Totaal</th>
                <th className="border border-white/30 px-2 py-2 text-center font-semibold text-white">VR</th>
                <th className="border border-white/30 px-2 py-2 text-center font-semibold text-white">VL</th>
                <th className="border border-white/30 px-2 py-2 text-center font-semibold text-white">Gem/Dag</th>
              </tr>
            </thead>
            <tbody>
              {klassen.map(klas => {
                const klasData = weeklyTotal.totals[klas] || {};
                const totals = klasTotals[klas];
                
                return (
                  <tr key={klas} className="hover:bg-white/10">
                    <td className="border border-white/30 px-2 py-2 font-semibold text-white">{klas}</td>
                    {weekDays.map(day => {
                      const dayData = klasData[day] || { total: 0, vr: 0, vl: 0 };
                      return (
                        <td key={day} className="border border-white/30 px-2 py-2 text-center text-white">
                          <div className="font-medium">{dayData.total}</div>
                          <div className="text-xs text-white/70">
                            {dayData.vr}/{dayData.vl}
                          </div>
                        </td>
                      );
                    })}
                    <td className="border border-white/30 px-2 py-2 text-center font-semibold bg-white/10 text-white">
                      {totals.total}
                    </td>
                    <td className="border border-white/30 px-2 py-2 text-center bg-blue-500/20 text-white">
                      {totals.vr}
                    </td>
                    <td className="border border-white/30 px-2 py-2 text-center bg-emerald-500/20 text-white">
                      {totals.vl}
                    </td>
                    <td className="border border-white/30 px-2 py-2 text-center text-white">
                      {totals.avg.toFixed(1)}
                    </td>
                  </tr>
                );
              })}
              
              {/* Fila de totales generales */}
              <tr className="bg-yellow-500/20 font-bold">
                <td className="border border-white/30 px-2 py-2 text-white">TOTAAL</td>
                {weekDays.map(day => {
                  const dayTotal = klassen.reduce((sum, klas) => {
                    const dayData = weeklyTotal.totals[klas]?.[day] || { total: 0 };
                    return sum + dayData.total;
                  }, 0);
                  return (
                    <td key={day} className="border border-white/30 px-2 py-2 text-center text-white">
                      {dayTotal}
                    </td>
                  );
                })}
                <td className="border border-white/30 px-2 py-2 text-center text-white">{weekTotal.total}</td>
                <td className="border border-white/30 px-2 py-2 text-center text-white">{weekTotal.vr}</td>
                <td className="border border-white/30 px-2 py-2 text-center text-white">{weekTotal.vl}</td>
                <td className="border border-white/30 px-2 py-2 text-center text-white">
                  {(weekTotal.total / 5).toFixed(1)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

