'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { loadData } from '@/lib/storage';
import { calculateDailyTotals, formatDateDisplay } from '@/lib/utils';
import { DailyRecord } from '@/types';

export default function StatsPage() {
  const [stats, setStats] = useState({
    totalChillOuts: 0,
    totalVR: 0,
    totalVL: 0,
    byHour: {} as { [hour: number]: { total: number; vr: number; vl: number } },
    byKlas: {} as { [klas: string]: { total: number; vr: number; vl: number } },
    byStudent: {} as { [studentId: string]: { name: string; klas: string; total: number; vr: number; vl: number } },
    recentDays: [] as { date: string; total: number; vr: number; vl: number }[],
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const loadDataAsync = async () => {
      const data = await loadData();
    
    // Calcular estadísticas
    let totalChillOuts = 0;
    let totalVR = 0;
    let totalVL = 0;
    const byHour: { [hour: number]: { total: number; vr: number; vl: number } } = {};
    const byKlas: { [klas: string]: { total: number; vr: number; vl: number } } = {};
    const byStudent: { [studentId: string]: { name: string; klas: string; total: number; vr: number; vl: number } } = {};
    const recentDays: { date: string; total: number; vr: number; vl: number }[] = [];

    // Inicializar horas
    for (let hour = 1; hour <= 7; hour++) {
      byHour[hour] = { total: 0, vr: 0, vl: 0 };
    }

    // Inicializar clases y estudiantes
    data.students.forEach(student => {
      if (!byKlas[student.klas]) {
        byKlas[student.klas] = { total: 0, vr: 0, vl: 0 };
      }
      if (student.status === 'Actief') {
        byStudent[student.id] = {
          name: student.name,
          klas: student.klas,
          total: 0,
          vr: 0,
          vl: 0,
        };
      }
    });

    // Procesar registros diarios
    const sortedDates = Object.keys(data.dailyRecords).sort().reverse().slice(0, 7);
    
    Object.keys(data.dailyRecords).forEach(date => {
      const record = data.dailyRecords[date];
      const totals = calculateDailyTotals(record, data.students);
      
      // Totales generales
      Object.values(totals.totals).forEach(count => {
        totalChillOuts += count;
      });
      Object.values(totals.vr).forEach(count => {
        totalVR += count;
      });
      Object.values(totals.vl).forEach(count => {
        totalVL += count;
      });

      // Por hora
      for (let hour = 1; hour <= 7; hour++) {
        byHour[hour].total += totals.totals[hour] || 0;
        byHour[hour].vr += totals.vr[hour] || 0;
        byHour[hour].vl += totals.vl[hour] || 0;
      }

      // Por clase y por estudiante
      data.students.forEach(student => {
        if (student.status === 'Actief') {
          const studentEntries = record.entries[student.id] || {};
          Object.values(studentEntries).forEach(entries => {
            if (Array.isArray(entries)) {
              entries.forEach(entry => {
                if (entry) {
                  // Contar en clase
                  byKlas[student.klas].total += 1;
                  if (entry.type === 'VR') {
                    byKlas[student.klas].vr += 1;
                  } else if (entry.type === 'VL') {
                    byKlas[student.klas].vl += 1;
                  }
                  
                  // Contar en estudiante
                  if (byStudent[student.id]) {
                    byStudent[student.id].total += 1;
                    if (entry.type === 'VR') {
                      byStudent[student.id].vr += 1;
                    } else if (entry.type === 'VL') {
                      byStudent[student.id].vl += 1;
                    }
                  }
                  // Los chill-outs genéricos (type === null) se cuentan en total pero no en VR/VL
                }
              });
            }
          });
        }
      });

      // Días recientes
      if (sortedDates.includes(date)) {
        const dayTotal = Object.values(totals.totals).reduce((a, b) => a + b, 0);
        const dayVR = Object.values(totals.vr).reduce((a, b) => a + b, 0);
        const dayVL = Object.values(totals.vl).reduce((a, b) => a + b, 0);
        recentDays.push({
          date,
          total: dayTotal,
          vr: dayVR,
          vl: dayVL,
        });
      }
    });

      setStats({
        totalChillOuts,
        totalVR,
        totalVL,
        byHour,
        byKlas,
        byStudent,
        recentDays: recentDays.sort((a, b) => b.date.localeCompare(a.date)),
      });
    };
    loadDataAsync();
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <Navigation />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-xl text-white">Laden...</div>
        </div>
      </div>
    );
  }

  const maxHourTotal = Math.max(...Object.values(stats.byHour).map(h => h.total), 1);
  const maxKlasTotal = Math.max(...Object.values(stats.byKlas).map(k => k.total), 1);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
      </div>
      <Navigation />
      <div className="container mx-auto px-4 py-6 relative z-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
            Statistieken
          </h1>
          <p className="text-sm text-white/80">Overzicht van alle chill-outs en trends</p>
        </div>

        {/* Estadísticas principales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="glass-effect rounded-lg shadow-md p-4 border-t-3 border-white/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-white/70">Totaal Chill-outs</p>
                <p className="text-2xl font-bold text-white">{stats.totalChillOuts}</p>
              </div>
              <div className="bg-white/20 rounded-full p-2">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="glass-effect rounded-lg shadow-md p-4 border-t-3 border-blue-400/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-white/70">Totaal VR</p>
                <p className="text-2xl font-bold text-blue-200">{stats.totalVR}</p>
                <p className="text-xs text-white/60 mt-0.5">
                  {stats.totalChillOuts > 0 ? Math.round((stats.totalVR / stats.totalChillOuts) * 100) : 0}%
                </p>
              </div>
              <div className="bg-blue-500/20 rounded-full p-2">
                <svg className="w-6 h-6 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>
          <div className="glass-effect rounded-lg shadow-md p-4 border-t-3 border-emerald-400/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-white/70">Totaal VL</p>
                <p className="text-2xl font-bold text-emerald-200">{stats.totalVL}</p>
                <p className="text-xs text-white/60 mt-0.5">
                  {stats.totalChillOuts > 0 ? Math.round((stats.totalVL / stats.totalChillOuts) * 100) : 0}%
                </p>
              </div>
              <div className="bg-emerald-500/20 rounded-full p-2">
                <svg className="w-6 h-6 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Gráfico por hora */}
          <div className="glass-effect rounded-lg shadow-md p-4 border border-white/30">
            <h2 className="text-lg font-bold mb-3 text-white">Chill-outs per Lesuur</h2>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6, 7].map(hour => {
                const hourData = stats.byHour[hour] || { total: 0, vr: 0, vl: 0 };
                const percentage = maxHourTotal > 0 ? (hourData.total / maxHourTotal) * 100 : 0;
                return (
                  <div key={hour}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-white">Lesuur {hour}</span>
                      <span className="text-sm font-bold text-white">{hourData.total}</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-6 overflow-hidden">
                      <div className="flex h-full">
                        <div
                          className="bg-blue-500 transition-all duration-500"
                          style={{ width: `${(hourData.vr / maxHourTotal) * 100}%` }}
                          title={`VR: ${hourData.vr}`}
                        />
                        <div
                          className="bg-emerald-500 transition-all duration-500"
                          style={{ width: `${(hourData.vl / maxHourTotal) * 100}%` }}
                          title={`VL: ${hourData.vl}`}
                        />
                      </div>
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-white/80">
                      <span>VR: {hourData.vr}</span>
                      <span>VL: {hourData.vl}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gráfico por clase */}
          <div className="glass-effect rounded-lg shadow-md p-4 border border-white/30">
            <h2 className="text-lg font-bold mb-3 text-white">Chill-outs per Klas</h2>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {Object.keys(stats.byKlas).sort((a, b) => stats.byKlas[b].total - stats.byKlas[a].total).map(klas => {
                const klasData = stats.byKlas[klas];
                const percentage = maxKlasTotal > 0 ? (klasData.total / maxKlasTotal) * 100 : 0;
                return (
                  <div key={klas}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-white">{klas}</span>
                      <span className="text-sm font-bold text-white">{klasData.total}</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-6 overflow-hidden">
                      <div className="flex h-full">
                        <div
                          className="bg-blue-500 transition-all duration-500"
                          style={{ width: `${(klasData.vr / maxKlasTotal) * 100}%` }}
                          title={`VR: ${klasData.vr}`}
                        />
                        <div
                          className="bg-emerald-500 transition-all duration-500"
                          style={{ width: `${(klasData.vl / maxKlasTotal) * 100}%` }}
                          title={`VL: ${klasData.vl}`}
                        />
                      </div>
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-white/80">
                      <span>VR: {klasData.vr}</span>
                      <span>VL: {klasData.vl}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Días recientes */}
        {stats.recentDays.length > 0 && (
          <div className="glass-effect rounded-lg shadow-md p-4 mt-4 border border-white/30">
            <h2 className="text-lg font-bold mb-3 text-white">Recente Dagen</h2>
            <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
              {stats.recentDays.map(day => (
                <div key={day.date} className="text-center p-3 bg-white/10 rounded-md">
                  <p className="text-xs font-medium text-white/80 mb-1">
                    {formatDateDisplay(new Date(day.date)).split(' ')[0]}
                  </p>
                  <p className="text-xl font-bold text-white">{day.total}</p>
                  <div className="flex justify-center gap-2 mt-2 text-xs">
                    <span className="text-blue-200">VR: {day.vr}</span>
                    <span className="text-emerald-200">VL: {day.vl}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Estadísticas por estudiante */}
        {Object.keys(stats.byStudent).length > 0 && (
          <div className="glass-effect rounded-lg shadow-md p-4 mt-4 border border-white/30">
            <h2 className="text-lg font-bold mb-3 text-white">Statistieken per Student</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/20 bg-white/10">
                    <th className="px-3 py-2 text-left font-semibold text-white">Naam</th>
                    <th className="px-3 py-2 text-left font-semibold text-white">Klas</th>
                    <th className="px-3 py-2 text-center font-semibold text-white">Totaal</th>
                    <th className="px-3 py-2 text-center font-semibold text-white">VR</th>
                    <th className="px-3 py-2 text-center font-semibold text-white">VL</th>
                    <th className="px-3 py-2 text-center font-semibold text-white">Chill-outs</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(stats.byStudent)
                    .sort((a, b) => {
                      const studentA = stats.byStudent[a];
                      const studentB = stats.byStudent[b];
                      if (studentA.klas !== studentB.klas) {
                        return studentA.klas.localeCompare(studentB.klas);
                      }
                      return studentA.name.localeCompare(studentB.name);
                    })
                    .map(studentId => {
                      const student = stats.byStudent[studentId];
                      const genericCount = student.total - student.vr - student.vl;
                      return (
                        <tr key={studentId} className="border-b border-white/10 hover:bg-white/10 transition-colors">
                          <td className="px-3 py-2 font-medium text-white">{student.name}</td>
                          <td className="px-3 py-2">
                            <span className="px-2 py-0.5 bg-white/20 rounded text-xs text-white">{student.klas}</span>
                          </td>
                          <td className="px-3 py-2 text-center font-semibold text-white">{student.total}</td>
                          <td className="px-3 py-2 text-center text-blue-200 font-medium">{student.vr}</td>
                          <td className="px-3 py-2 text-center text-emerald-200 font-medium">{student.vl}</td>
                          <td className="px-3 py-2 text-center text-white/80">{genericCount}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

