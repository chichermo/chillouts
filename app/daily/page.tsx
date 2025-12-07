'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { formatDate, formatDateDisplay, getDayName } from '@/lib/utils';
import { loadData } from '@/lib/storage';

export default function DailyListPage() {
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDate, setCustomDate] = useState<string>('');

  useEffect(() => {
    const loadDataAsync = async () => {
      const data = await loadData();
      const allDates = Object.keys(data.dailyRecords).sort().reverse();
      setDates(allDates);
      
      if (allDates.length > 0 && !selectedDate) {
        setSelectedDate(allDates[0]);
      }
    };
    loadDataAsync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateWeekDates = (startDate?: Date) => {
    const dates: string[] = [];
    const baseDate = startDate || new Date();
    const startOfWeek = new Date(baseDate);
    startOfWeek.setDate(baseDate.getDate() - baseDate.getDay() + 1); // Lunes
    
    for (let i = 0; i < 5; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(formatDate(date));
    }
    return dates;
  };

  const generateMultipleWeeks = (weeks: number = 4) => {
    const dates: string[] = [];
    const today = new Date();
    const startOfCurrentWeek = new Date(today);
    startOfCurrentWeek.setDate(today.getDate() - today.getDay() + 1); // Lunes
    
    for (let week = 0; week < weeks; week++) {
      const weekStart = new Date(startOfCurrentWeek);
      weekStart.setDate(startOfCurrentWeek.getDate() + (week * 7));
      
      for (let day = 0; day < 5; day++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + day);
        dates.push(formatDate(date));
      }
    }
    return dates;
  };

  const handleDateSelect = (dateStr: string) => {
    window.location.href = `/daily/${dateStr}`;
  };

  const handleCustomDateSubmit = () => {
    if (customDate) {
      handleDateSelect(customDate);
    }
  };

  const weekDates = generateWeekDates();
  const futureWeeks = generateMultipleWeeks(4); // Generar 4 semanas hacia adelante

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl"></div>
      </div>

      <Navigation />
      <div className="container mx-auto px-4 py-12 relative z-10">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-block mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-white/20 rounded-2xl blur-xl opacity-50"></div>
              <h1 className="relative text-5xl md:text-6xl font-black mb-3 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent tracking-tight">
                Dagelijks Overzicht
              </h1>
            </div>
          </div>
          <p className="text-lg text-white/90 font-medium">Selecteer een dag om chill-outs te registreren of te bekijken</p>
        </div>

        {/* Selector de fecha personalizado */}
        <div className="mb-6 glass-effect rounded-xl p-4 border border-white/20">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <label className="text-sm font-medium text-white/90">Selecteer een specifieke datum:</label>
            <div className="flex gap-2 flex-1">
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="px-3 py-2 text-sm bg-white/10 border border-white/20 rounded-md text-white focus:border-white/50 focus:ring-1 focus:ring-white/50 focus:outline-none transition-colors"
                min={formatDate(new Date(new Date().getFullYear(), 0, 1))} // Año actual desde enero
                max={formatDate(new Date(new Date().getFullYear() + 1, 11, 31))} // Hasta fin del próximo año
              />
              <button
                onClick={handleCustomDateSubmit}
                disabled={!customDate}
                className="px-4 py-2 text-sm bg-gradient-to-r from-white to-blue-100 text-blue-900 rounded-md hover:from-white/90 hover:to-blue-100/90 font-medium shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Ga naar datum
              </button>
            </div>
          </div>
        </div>

        {/* Deze Week Section */}
        <div className="mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/10 rounded-3xl blur-2xl"></div>
            <div className="relative glass-effect rounded-3xl p-6 md:p-8 border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white to-blue-100 flex items-center justify-center shadow-lg shadow-white/20">
                    <svg className="w-6 h-6 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-black text-white">
                    Deze Week
                  </h2>
                </div>
                <button
                  onClick={() => {
                    const nextWeek = new Date();
                    nextWeek.setDate(nextWeek.getDate() + 7);
                    const nextWeekDates = generateWeekDates(nextWeek);
                    // Ir al primer día de la próxima semana
                    handleDateSelect(nextWeekDates[0]);
                  }}
                  className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-colors text-white border border-white/20"
                >
                  Volgende Week →
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-4">
                {weekDates.map(date => {
                  const dateObj = new Date(date);
                  const isToday = date === formatDate(new Date());
                  const hasData = dates.includes(date);
                  return (
                    <Link
                      key={date}
                      href={`/daily/${date}`}
                      className="group relative overflow-hidden"
                    >
                      <div className={`absolute inset-0 rounded-2xl blur-xl transition-all ${
                        isToday
                          ? 'bg-gradient-to-br from-white/30 to-white/20'
                          : hasData
                          ? 'bg-gradient-to-br from-white/20 to-white/10'
                          : 'bg-gradient-to-br from-white/10 to-white/5'
                      } group-hover:opacity-75`}></div>
                      <div className={`relative glass-effect rounded-2xl p-4 border transition-all duration-300 text-center group-hover:scale-105 ${
                        isToday
                          ? 'border-white/40 hover:border-white/50'
                          : hasData
                          ? 'border-white/20 hover:border-white/40'
                          : 'border-white/20 hover:border-white/20'
                      }`}>
                        <div className={`font-black text-base mb-1 ${
                          isToday ? 'text-white' : hasData ? 'text-white' : 'text-white/90'
                        }`}>
                          {formatDateDisplay(dateObj).split(' ')[0]}
                        </div>
                        <div className="text-xs text-white/85 mb-2 font-medium">{getDayName(dateObj)}</div>
                        <div className={`text-xs font-bold mb-1 ${
                          isToday ? 'text-white' : hasData ? 'text-white/90' : 'text-white/85'
                        }`}>
                          {formatDateDisplay(dateObj).split(' ')[1]}
                        </div>
                        {hasData && (
                          <div className="mt-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/20 border border-white/20">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                        {isToday && (
                          <div className="mt-2 inline-block px-2 py-0.5 rounded-full bg-white/20 border border-white/20">
                            <span className="text-[10px] font-bold text-white uppercase tracking-wider">Vandaag</span>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Komende Weken Section */}
        <div className="mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/10 rounded-3xl blur-2xl"></div>
            <div className="relative glass-effect rounded-3xl p-6 md:p-8 border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white to-emerald-100 flex items-center justify-center shadow-lg shadow-white/20">
                    <svg className="w-6 h-6 text-emerald-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-black text-white">
                    Komende Weken (4 weken)
                  </h2>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {futureWeeks.map(date => {
                  const dateObj = new Date(date);
                  const isToday = date === formatDate(new Date());
                  const hasData = dates.includes(date);
                  const isPast = dateObj < new Date() && !isToday;
                  return (
                    <Link
                      key={date}
                      href={`/daily/${date}`}
                      className="group relative overflow-hidden"
                    >
                      <div className={`absolute inset-0 rounded-xl blur-lg transition-opacity ${
                        isToday
                          ? 'bg-gradient-to-br from-white/30 to-white/20'
                          : hasData
                          ? 'bg-gradient-to-br from-white/20 to-white/10'
                          : 'bg-gradient-to-br from-white/10 to-white/5'
                      } group-hover:opacity-75`}></div>
                      <div className={`relative glass-effect rounded-xl p-3 border transition-all duration-300 text-center group-hover:scale-105 ${
                        isToday
                          ? 'border-white/40 hover:border-white/50'
                          : hasData
                          ? 'border-white/20 hover:border-white/40'
                          : isPast
                          ? 'border-white/10 hover:border-white/20 opacity-70'
                          : 'border-white/20 hover:border-white/20'
                      }`}>
                        <div className={`font-black text-sm mb-1 ${
                          isToday ? 'text-white' : hasData ? 'text-white' : isPast ? 'text-white/60' : 'text-white/90'
                        }`}>
                          {formatDateDisplay(dateObj).split(' ')[0]}
                        </div>
                        <div className="text-xs text-white/85 mb-1 font-medium">{getDayName(dateObj)}</div>
                        <div className={`text-xs font-bold mb-1 ${
                          isToday ? 'text-white' : hasData ? 'text-white/90' : isPast ? 'text-white/50' : 'text-white/85'
                        }`}>
                          {formatDateDisplay(dateObj).split(' ')[1]}
                        </div>
                        {hasData && (
                          <div className="mt-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20 border border-white/20">
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                        {isToday && (
                          <div className="mt-1 inline-block px-1.5 py-0.5 rounded-full bg-white/20 border border-white/20">
                            <span className="text-[9px] font-bold text-white uppercase">Nu</span>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Alle Dagen Section */}
        {dates.length > 0 && (
          <div className="mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/10 rounded-3xl blur-2xl"></div>
              <div className="relative glass-effect rounded-3xl p-6 md:p-8 border border-white/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white to-indigo-100 flex items-center justify-center shadow-lg shadow-white/20">
                    <svg className="w-6 h-6 text-indigo-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-black text-white">
                    Alle Dagen met Registraties
                  </h2>
                  <div className="ml-auto px-3 py-1 rounded-full bg-white/20 border border-white/20">
                    <span className="text-sm font-bold text-white">{dates.length}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {dates.map(date => {
                    const dateObj = new Date(date);
                    const isToday = date === formatDate(new Date());
                    return (
                      <Link
                        key={date}
                        href={`/daily/${date}`}
                        className="group relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/10 rounded-xl blur-lg group-hover:opacity-75 transition-opacity"></div>
                        <div className="relative glass-effect rounded-xl p-3 border border-white/20 hover:border-white/40 transition-all duration-300 text-center group-hover:scale-105">
                          <div className={`font-black text-sm mb-1 ${isToday ? 'text-white' : 'text-white/90'}`}>
                            {formatDateDisplay(dateObj).split(' ')[0]}
                          </div>
                          <div className="text-xs text-white/85 mb-1 font-medium">{getDayName(dateObj)}</div>
                          <div className={`text-xs font-bold ${isToday ? 'text-white' : 'text-white/90'}`}>
                            {formatDateDisplay(dateObj).split(' ')[1]}
                          </div>
                          {isToday && (
                            <div className="mt-2 inline-block px-1.5 py-0.5 rounded-full bg-white/20 border border-white/20">
                              <span className="text-[9px] font-bold text-white uppercase">Nu</span>
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {dates.length === 0 && (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 rounded-3xl blur-xl"></div>
            <div className="relative glass-effect rounded-3xl p-8 border border-white/20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/30 to-white/20 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-white font-medium text-lg mb-2">Geen dagelijkse registraties gevonden</p>
              <p className="text-white/85 text-sm">Ga naar een specifieke dag om te beginnen</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

