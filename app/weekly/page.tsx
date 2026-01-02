'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { WeeklyTotal } from '@/types';
import { loadData } from '@/lib/storage';
import { getWeekNumber, getWeekStartDate, formatDate, calculateWeeklyTotals, calculateWeeklyTotalsByStudent } from '@/lib/utils';

export default function WeeklyPage() {
  const [selectedWeek, setSelectedWeek] = useState<number>(0);
  const [weeklyTotal, setWeeklyTotal] = useState<WeeklyTotal | null>(null);
  const [klassen, setKlassen] = useState<string[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [studentTotals, setStudentTotals] = useState<{ [studentId: string]: { name: string; klas: string; totals: { [day: string]: { total: number; vr: number; vl: number } } } }>({});
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'klas' | 'student'>('klas');

  useEffect(() => {
    setMounted(true);
    const loadDataAsync = async () => {
      const data = await loadData();
      const allKlassen = [...new Set(data.students.map(s => s.klas))].sort();
      setKlassen(allKlassen);
      setStudents(data.students);

      // Obtener semana actual
      const today = new Date();
      const currentWeek = getWeekNumber(today);
      setSelectedWeek(currentWeek);
      
      // Calcular totales de la semana actual
      const weekStart = getWeekStartDate(today);
      const totals = calculateWeeklyTotals(currentWeek, weekStart, data.dailyRecords, data.students);
      setWeeklyTotal(totals);
      
      // Calcular totales por estudiante
      const byStudent = calculateWeeklyTotalsByStudent(currentWeek, weekStart, data.dailyRecords, data.students);
      setStudentTotals(byStudent);
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
    
    // Calcular totales por estudiante
    const byStudent = calculateWeeklyTotalsByStudent(weekNumber, weekStart, data.dailyRecords, data.students);
    setStudentTotals(byStudent);
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

        {/* Selector de semana y vista */}
        <div className="glass-effect p-4 rounded-lg shadow-md mb-4 border border-white/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-sm text-white/90 font-medium">
                Selecteer Week:
              </label>
              <select
                value={selectedWeek}
                onChange={(e) => handleWeekChange(parseInt(e.target.value))}
                className="px-3 py-2 text-sm bg-white/10 border border-white/20 rounded-md w-full text-white focus:border-white/50 focus:ring-1 focus:ring-white/50 focus:outline-none"
              >
                {weeks.map(week => (
                  <option key={week} value={week} className="bg-blue-900">
                    Week {week} {week === currentWeek ? '(Huidige week)' : ''}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-white/90">
                Week {selectedWeek} ({weekStartStr})
              </p>
            </div>
            <div>
              <label className="block mb-2 text-sm text-white/90 font-medium">
                Weergave:
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('klas')}
                  className={`flex-1 px-4 py-2 text-sm rounded-md font-medium transition-colors ${
                    viewMode === 'klas'
                      ? 'bg-gradient-to-r from-white to-blue-100 text-blue-900'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  Per Klas
                </button>
                <button
                  onClick={() => setViewMode('student')}
                  className={`flex-1 px-4 py-2 text-sm rounded-md font-medium transition-colors ${
                    viewMode === 'student'
                      ? 'bg-gradient-to-r from-white to-blue-100 text-blue-900'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  Per Student
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de totales por clase */}
        {viewMode === 'klas' && (
        <div className="glass-effect p-4 rounded-lg shadow-md overflow-x-auto border border-white/20 mb-4">
          <h2 className="text-lg font-semibold mb-3 text-white">
            TOTALEN PER KLAS - Week {selectedWeek}
          </h2>
          
          <table className="w-full border-collapse min-w-[800px] text-sm">
            <thead>
              <tr className="bg-white/10">
                <th className="border border-white/20 px-2 py-2 text-left font-semibold text-white">Klas</th>
                {weekDays.map(day => (
                  <th key={day} className="border border-white/20 px-2 py-2 text-center font-semibold text-xs text-white">{day}</th>
                ))}
                <th className="border border-white/20 px-2 py-2 text-center font-semibold text-white">Totaal</th>
                <th className="border border-white/20 px-2 py-2 text-center font-semibold text-white">VR</th>
                <th className="border border-white/20 px-2 py-2 text-center font-semibold text-white">VL</th>
                <th className="border border-white/20 px-2 py-2 text-center font-semibold text-white">Gem/Dag</th>
              </tr>
            </thead>
            <tbody>
              {klassen.map(klas => {
                const klasData = weeklyTotal.totals[klas] || {};
                const totals = klasTotals[klas];
                
                return (
                  <tr key={klas} className="hover:bg-white/10">
                    <td className="border border-white/20 px-2 py-2 font-semibold text-white">{klas}</td>
                    {weekDays.map(day => {
                      const dayData = klasData[day] || { total: 0, vr: 0, vl: 0 };
                      return (
                        <td key={day} className="border border-white/20 px-2 py-2 text-center text-white">
                          <div className="font-medium">{dayData.total}</div>
                          <div className="text-xs text-white/85">
                            {dayData.vr}/{dayData.vl}
                          </div>
                        </td>
                      );
                    })}
                    <td className="border border-white/20 px-2 py-2 text-center font-semibold bg-white/10 text-white">
                      {totals.total}
                    </td>
                    <td className="border border-white/20 px-2 py-2 text-center bg-blue-500/20 text-white">
                      {totals.vr}
                    </td>
                    <td className="border border-white/20 px-2 py-2 text-center bg-emerald-500/20 text-white">
                      {totals.vl}
                    </td>
                    <td className="border border-white/20 px-2 py-2 text-center text-white">
                      {totals.avg.toFixed(1)}
                    </td>
                  </tr>
                );
              })}
              
              {/* Rij van algemene totalen */}
              <tr className="bg-brand-orange-500/20 font-bold">
                <td className="border border-white/20 px-2 py-2 text-white">TOTAAL</td>
                {weekDays.map(day => {
                  const dayTotal = klassen.reduce((sum, klas) => {
                    const dayData = weeklyTotal.totals[klas]?.[day] || { total: 0 };
                    return sum + dayData.total;
                  }, 0);
                  return (
                    <td key={day} className="border border-white/20 px-2 py-2 text-center text-white">
                      {dayTotal}
                    </td>
                  );
                })}
                <td className="border border-white/20 px-2 py-2 text-center text-white">{weekTotal.total}</td>
                <td className="border border-white/20 px-2 py-2 text-center text-white">{weekTotal.vr}</td>
                <td className="border border-white/20 px-2 py-2 text-center text-white">{weekTotal.vl}</td>
                <td className="border border-white/20 px-2 py-2 text-center text-white">
                  {(weekTotal.total / 5).toFixed(1)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        )}

        {/* Tabla de totales por estudiante */}
        {viewMode === 'student' && (
        <div className="glass-effect p-4 rounded-lg shadow-md overflow-x-auto border border-white/20">
          <h2 className="text-lg font-semibold mb-3 text-white">
            TOTALEN PER STUDENT - Week {selectedWeek}
          </h2>
          
          {/* Agrupar por clase */}
          {klassen.map(klas => {
            const klasStudents = students.filter(s => s.klas === klas && s.status === 'Actief');
            if (klasStudents.length === 0) return null;
            
            // Calcular totales por estudiante en esta clase
            const studentTotalsForKlas = klasStudents.map(student => {
              const totals = studentTotals[student.id]?.totals || {};
              let weekTotal = 0;
              let weekVR = 0;
              let weekVL = 0;
              
              weekDays.forEach(day => {
                const dayData = totals[day] || { total: 0, vr: 0, vl: 0 };
                weekTotal += dayData.total;
                weekVR += dayData.vr;
                weekVL += dayData.vl;
              });
              
              return {
                student,
                totals,
                weekTotal,
                weekVR,
                weekVL,
                avg: weekTotal / 5,
              };
            }).sort((a, b) => b.weekTotal - a.weekTotal);
            
            return (
              <div key={klas} className="mb-6">
                <h3 className="text-md font-semibold mb-2 text-yellow-200 bg-gradient-to-r from-yellow-500/20 to-yellow-400/20 px-3 py-2 rounded-md border-l-3 border-yellow-400/50">
                  {klas}
                </h3>
                <table className="w-full border-collapse min-w-[800px] text-sm mb-4">
                  <thead>
                    <tr className="bg-white/10">
                      <th className="border border-white/20 px-2 py-2 text-left font-semibold text-white">Student</th>
                      {weekDays.map(day => (
                        <th key={day} className="border border-white/20 px-2 py-2 text-center font-semibold text-xs text-white">{day}</th>
                      ))}
                      <th className="border border-white/20 px-2 py-2 text-center font-semibold text-white">Totaal</th>
                      <th className="border border-white/20 px-2 py-2 text-center font-semibold text-white">VR</th>
                      <th className="border border-white/20 px-2 py-2 text-center font-semibold text-white">VL</th>
                      <th className="border border-white/20 px-2 py-2 text-center font-semibold text-white">Gem/Dag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentTotalsForKlas.map(({ student, totals, weekTotal, weekVR, weekVL, avg }) => (
                      <tr key={student.id} className="hover:bg-white/10">
                        <td className="border border-white/20 px-2 py-2 font-medium text-white">{student.name}</td>
                        {weekDays.map(day => {
                          const dayData = totals[day] || { total: 0, vr: 0, vl: 0 };
                          return (
                            <td key={day} className="border border-white/20 px-2 py-2 text-center text-white">
                              <div className="font-medium">{dayData.total}</div>
                              <div className="text-xs text-white/85">
                                {dayData.vr}/{dayData.vl}
                              </div>
                            </td>
                          );
                        })}
                        <td className="border border-white/20 px-2 py-2 text-center font-semibold bg-white/10 text-white">
                          {weekTotal}
                        </td>
                        <td className="border border-white/20 px-2 py-2 text-center bg-blue-500/20 text-white">
                          {weekVR}
                        </td>
                        <td className="border border-white/20 px-2 py-2 text-center bg-emerald-500/20 text-white">
                          {weekVL}
                        </td>
                        <td className="border border-white/20 px-2 py-2 text-center text-white">
                          {avg.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}

