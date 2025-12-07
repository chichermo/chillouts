'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { loadData } from '@/lib/storage';
import { calculateDailyTotals, formatDateDisplay, getDayName } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

// Importeer jspdf-autotable om jsPDF uit te breiden
if (typeof window !== 'undefined') {
  import('jspdf-autotable');
}

interface FilterState {
  klas: string;
  student: string;
  dateFrom: string;
  dateTo: string;
  generatedBy: string;
}

export default function ReportsPage() {
  const [stats, setStats] = useState({
    totalChillOuts: 0,
    totalVR: 0,
    totalVL: 0,
    totalGeneric: 0,
    byHour: [] as { hour: number; total: number; vr: number; vl: number; generic: number }[],
    byKlas: [] as { klas: string; total: number; vr: number; vl: number; generic: number; percentage: number }[],
    byStudent: [] as { name: string; klas: string; total: number; vr: number; vl: number; generic: number }[],
    byDay: [] as { date: string; total: number; vr: number; vl: number; generic: number }[],
    weeklyTrend: [] as { week: string; total: number; vr: number; vl: number }[],
  });
  const [mounted, setMounted] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    klas: '',
    student: '',
    dateFrom: '',
    dateTo: '',
    generatedBy: '',
  });
  const [allStudents, setAllStudents] = useState<{ id: string; name: string; klas: string }[]>([]);
  const [allKlassen, setAllKlassen] = useState<string[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<{ id: string; name: string; klas: string }[]>([]);

  const COLORS = {
    vr: '#3b82f6', // blue
    vl: '#10b981', // emerald
    generic: '#6b7280', // gray
    total: '#8b5cf6', // purple
  };

  useEffect(() => {
    setMounted(true);
    const loadDataAsync = async () => {
      const data = await loadData();
      
      // Verkrijg alle klassen en studenten
      const klassen = [...new Set(data.students.map(s => s.klas))].sort();
      const students = data.students
        .filter(s => s.status === 'Actief')
        .map(s => ({ id: s.id, name: s.name, klas: s.klas }));
      
      setAllKlassen(klassen);
      setAllStudents(students);
      setFilteredStudents(students);
      
      calculateStats(data, filters);
    };
    loadDataAsync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mounted) {
      const loadDataAsync = async () => {
        const data = await loadData();
        calculateStats(data, filters);
      };
      loadDataAsync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, mounted]);

  useEffect(() => {
    if (filters.klas) {
      const filtered = allStudents.filter(s => s.klas === filters.klas);
      setFilteredStudents(filtered);
      if (filters.student && !filtered.find(s => s.id === filters.student)) {
        setFilters(prev => ({ ...prev, student: '' }));
      }
    } else {
      setFilteredStudents(allStudents);
      if (filters.student) {
        setFilters(prev => ({ ...prev, student: '' }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.klas, allStudents]);

  const calculateStats = (data: any, currentFilters: FilterState) => {
    // Bereken volledige statistieken met filters
    let totalChillOuts = 0;
    let totalVR = 0;
    let totalVL = 0;
    let totalGeneric = 0;
    
    const byHourData: { [hour: number]: { total: number; vr: number; vl: number; generic: number } } = {};
    const byKlasData: { [klas: string]: { total: number; vr: number; vl: number; generic: number } } = {};
    const byStudentData: { [studentId: string]: { name: string; klas: string; total: number; vr: number; vl: number; generic: number } } = {};
    const byDayData: { [date: string]: { total: number; vr: number; vl: number; generic: number } } = {};

    // Initialiseer lesuren
    for (let hour = 1; hour <= 7; hour++) {
      byHourData[hour] = { total: 0, vr: 0, vl: 0, generic: 0 };
    }

    // Initialiseer klassen (alleen die in filters)
    const studentsToProcess = data.students.filter((student: any) => {
      if (student.status !== 'Actief') return false;
      if (currentFilters.klas && student.klas !== currentFilters.klas) return false;
      if (currentFilters.student && student.id !== currentFilters.student) return false;
      return true;
    });

    studentsToProcess.forEach((student: any) => {
      if (!byKlasData[student.klas]) {
        byKlasData[student.klas] = { total: 0, vr: 0, vl: 0, generic: 0 };
      }
      byStudentData[student.id] = {
        name: student.name,
        klas: student.klas,
        total: 0,
        vr: 0,
        vl: 0,
        generic: 0,
      };
    });

    // Verwerk dagelijkse registraties met datum filters
    Object.keys(data.dailyRecords).forEach(date => {
      // Filter op datum
      if (currentFilters.dateFrom && date < currentFilters.dateFrom) return;
      if (currentFilters.dateTo && date > currentFilters.dateTo) return;

      const record = data.dailyRecords[date];
      const totals = calculateDailyTotals(record, studentsToProcess);
      
      let dayTotal = 0;
      let dayVR = 0;
      let dayVL = 0;
      let dayGeneric = 0;

      // Per lesuur
      for (let hour = 1; hour <= 7; hour++) {
        const hourTotal = totals.totals[hour] || 0;
        const hourVR = totals.vr[hour] || 0;
        const hourVL = totals.vl[hour] || 0;
        const hourGeneric = hourTotal - hourVR - hourVL;
        
        byHourData[hour].total += hourTotal;
        byHourData[hour].vr += hourVR;
        byHourData[hour].vl += hourVL;
        byHourData[hour].generic += hourGeneric;
        
        dayTotal += hourTotal;
        dayVR += hourVR;
        dayVL += hourVL;
        dayGeneric += hourGeneric;
      }

      // Per klas en per student
      studentsToProcess.forEach((student: any) => {
        const studentEntries = record.entries[student.id] || {};
        Object.values(studentEntries).forEach(entries => {
          if (Array.isArray(entries)) {
            entries.forEach(entry => {
              if (entry) {
                byKlasData[student.klas].total += 1;
                byStudentData[student.id].total += 1;
                
                if (entry.type === 'VR') {
                  byKlasData[student.klas].vr += 1;
                  byStudentData[student.id].vr += 1;
                } else if (entry.type === 'VL') {
                  byKlasData[student.klas].vl += 1;
                  byStudentData[student.id].vl += 1;
                } else {
                  byKlasData[student.klas].generic += 1;
                  byStudentData[student.id].generic += 1;
                }
              }
            });
          }
        });
      });

      byDayData[date] = { total: dayTotal, vr: dayVR, vl: dayVL, generic: dayGeneric };
      
      totalChillOuts += dayTotal;
      totalVR += dayVR;
      totalVL += dayVL;
      totalGeneric += dayGeneric;
    });

    // Converteer naar arrays voor grafieken
    const byHourArray = Object.keys(byHourData).map(hour => ({
      hour: parseInt(hour),
      ...byHourData[parseInt(hour)],
    }));

    const totalForPercentage = totalChillOuts || 1;
    const byKlasArray = Object.keys(byKlasData).map(klas => ({
      klas,
      ...byKlasData[klas],
      percentage: Math.round((byKlasData[klas].total / totalForPercentage) * 100),
    })).sort((a, b) => b.total - a.total);

    const byStudentArray = Object.values(byStudentData)
      .filter(s => s.total > 0)
      .sort((a, b) => {
        if (a.klas !== b.klas) return a.klas.localeCompare(b.klas);
        return a.name.localeCompare(b.name);
      });

    const byDayArray = Object.keys(byDayData)
      .sort()
      .map(date => ({
        date: formatDateDisplay(new Date(date)),
        ...byDayData[date],
      }));

    setStats({
      totalChillOuts,
      totalVR,
      totalVL,
      totalGeneric,
      byHour: byHourArray,
      byKlas: byKlasArray,
      byStudent: byStudentArray,
      byDay: byDayArray,
      weeklyTrend: [],
    });
  };

  const getReportHeader = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('nl-NL', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const dayName = getDayName(now);
    return {
      date: dateStr,
      day: dayName,
      generatedBy: filters.generatedBy || 'Systeem',
    };
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const header = getReportHeader();
    
    // Blad 1: Algemeen Overzicht
    const summaryData = [
      ['Rapport Chill-outs'],
      [''],
      ['Rapport Details'],
      ['Datum gegenereerd:', header.date],
      ['Dag gegenereerd:', header.day],
      ['Gegenereerd door:', header.generatedBy],
      [''],
      ['Filter Instellingen'],
      ['Klas filter:', filters.klas || 'Alle klassen'],
      ['Student filter:', filters.student ? filteredStudents.find(s => s.id === filters.student)?.name || '' : 'Alle studenten'],
      ['Van datum:', filters.dateFrom || 'Geen'],
      ['Tot datum:', filters.dateTo || 'Geen'],
      [''],
      ['Algemeen Overzicht'],
      ['Totaal Chill-outs', stats.totalChillOuts],
      ['Totaal VR', stats.totalVR],
      ['Totaal VL', stats.totalVL],
      ['Totaal Generiek', stats.totalGeneric],
      [''],
      ['Per Lesuur'],
      ['Lesuur', 'Totaal', 'VR', 'VL', 'Generiek'],
      ...stats.byHour.map(h => [h.hour, h.total, h.vr, h.vl, h.generic]),
      [''],
      ['Per Klas'],
      ['Klas', 'Totaal', 'VR', 'VL', 'Generiek', 'Percentage'],
      ...stats.byKlas.map(k => [k.klas, k.total, k.vr, k.vl, k.generic, `${k.percentage}%`]),
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Overzicht');

    // Blad 2: Per Student
    const studentData = [
      ['Student', 'Klas', 'Totaal', 'VR', 'VL', 'Generiek'],
      ...stats.byStudent.map(s => [s.name, s.klas, s.total, s.vr, s.vl, s.generic]),
    ];
    const studentSheet = XLSX.utils.aoa_to_sheet(studentData);
    XLSX.utils.book_append_sheet(workbook, studentSheet, 'Per Student');

    // Blad 3: Per Dag
    const dayData = [
      ['Datum', 'Totaal', 'VR', 'VL', 'Generiek'],
      ...stats.byDay.map(d => [d.date, d.total, d.vr, d.vl, d.generic]),
    ];
    const daySheet = XLSX.utils.aoa_to_sheet(dayData);
    XLSX.utils.book_append_sheet(workbook, daySheet, 'Per Dag');

    const filename = `Chill-outs_Rapport_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  const exportToPDF = async () => {
    try {
      await import('jspdf-autotable');
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;
      const header = getReportHeader();

      // Titel
      doc.setFontSize(20);
      doc.text('Rapport Chill-outs', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      // Rapport details
      doc.setFontSize(10);
      doc.text(`Datum gegenereerd: ${header.date}`, 14, yPos);
      yPos += 7;
      doc.text(`Dag gegenereerd: ${header.day}`, 14, yPos);
      yPos += 7;
      doc.text(`Gegenereerd door: ${header.generatedBy}`, 14, yPos);
      yPos += 10;

      // Filter informatie
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Filter Instellingen:', 14, yPos);
      yPos += 6;
      doc.text(`Klas: ${filters.klas || 'Alle klassen'}`, 14, yPos);
      yPos += 6;
      if (filters.student) {
        const studentName = filteredStudents.find(s => s.id === filters.student)?.name || '';
        doc.text(`Student: ${studentName}`, 14, yPos);
        yPos += 6;
      }
      if (filters.dateFrom || filters.dateTo) {
        doc.text(`Periode: ${filters.dateFrom || 'Begin'} - ${filters.dateTo || 'Einde'}`, 14, yPos);
        yPos += 6;
      }
      yPos += 5;

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text('Algemeen Overzicht', 14, yPos);
      yPos += 10;
      
      doc.setFontSize(10);
      doc.text(`Totaal Chill-outs: ${stats.totalChillOuts}`, 14, yPos);
      yPos += 7;
      doc.text(`Totaal VR: ${stats.totalVR}`, 14, yPos);
      yPos += 7;
      doc.text(`Totaal VL: ${stats.totalVL}`, 14, yPos);
      yPos += 7;
      doc.text(`Totaal Generiek: ${stats.totalGeneric}`, 14, yPos);
      yPos += 10;

      // Helper functie om tabellen handmatig te maken
      const drawTable = (startY: number, headers: string[], rows: string[][]) => {
        const colWidths = [40, 20, 20, 20, 30, 25];
        const rowHeight = 8;
        let currentY = startY;
        
        // Header tekenen
        doc.setFillColor(59, 130, 246);
        doc.rect(14, currentY, colWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        let xPos = 14;
        headers.forEach((header, i) => {
          doc.text(header, xPos + 2, currentY + 5);
          xPos += colWidths[i];
        });
        
        currentY += rowHeight;
        doc.setTextColor(0, 0, 0);
        
        // Rijen tekenen
        rows.forEach((row, rowIndex) => {
          if (currentY > 280) {
            doc.addPage();
            currentY = 20;
          }
          
          // Achtergrondkleur afwisselen
          if (rowIndex % 2 === 0) {
            doc.setFillColor(245, 245, 245);
            doc.rect(14, currentY, colWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');
          }
          
          xPos = 14;
          row.forEach((cell, i) => {
            doc.text(cell, xPos + 2, currentY + 5);
            xPos += colWidths[i];
          });
          
          currentY += rowHeight;
        });
        
        return currentY;
      };

      // Tabel per Klas
      if (stats.byKlas.length > 0) {
        doc.setFontSize(14);
        doc.text('Per Klas', 14, yPos);
        yPos += 10;
        
        const klasHeaders = ['Klas', 'Totaal', 'VR', 'VL', 'Generiek', 'Percentage'];
        const klasRows = stats.byKlas.map(k => [
          k.klas.length > 15 ? k.klas.substring(0, 15) + '...' : k.klas,
          k.total.toString(),
          k.vr.toString(),
          k.vl.toString(),
          k.generic.toString(),
          `${k.percentage}%`,
        ]);
        
        yPos = drawTable(yPos, klasHeaders, klasRows) + 10;
      }

      // Tabel per Student (als er ruimte is)
      if (stats.byStudent.length > 0 && yPos < 250) {
        doc.setFontSize(14);
        doc.text('Top Studenten', 14, yPos);
        yPos += 10;
        
        const studentHeaders = ['Student', 'Klas', 'Totaal', 'VR', 'VL', 'Generiek'];
        const studentRows = stats.byStudent
          .sort((a, b) => b.total - a.total)
          .slice(0, 20)
          .map(s => [
            s.name.length > 15 ? s.name.substring(0, 15) + '...' : s.name,
            s.klas.length > 10 ? s.klas.substring(0, 10) + '...' : s.klas,
            s.total.toString(),
            s.vr.toString(),
            s.vl.toString(),
            s.generic.toString(),
          ]);
        
        drawTable(yPos, studentHeaders, studentRows);
      }

      doc.save(`Chill-outs_Rapport_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Fout bij exporteren PDF:', error);
      // Fallback: eenvoudige PDF zonder tabellen
      const doc = new jsPDF();
      const header = getReportHeader();
      doc.setFontSize(20);
      doc.text('Rapport Chill-outs', 105, 20, { align: 'center' });
      
      let yPos = 35;
      doc.setFontSize(9);
      doc.text(`Datum: ${header.date} | Dag: ${header.day} | Door: ${header.generatedBy}`, 14, yPos);
      yPos += 10;
      
      doc.setFontSize(12);
      doc.text(`Totaal Chill-outs: ${stats.totalChillOuts}`, 14, yPos);
      yPos += 10;
      doc.text(`Totaal VR: ${stats.totalVR}`, 14, yPos);
      yPos += 10;
      doc.text(`Totaal VL: ${stats.totalVL}`, 14, yPos);
      yPos += 10;
      doc.text(`Totaal Generiek: ${stats.totalGeneric}`, 14, yPos);
      yPos += 15;
      
      doc.setFontSize(14);
      doc.text('Per Klas:', 14, yPos);
      yPos += 10;
      doc.setFontSize(10);
      stats.byKlas.forEach(k => {
        doc.text(`${k.klas}: Totaal=${k.total}, VR=${k.vr}, VL=${k.vl}, Generiek=${k.generic} (${k.percentage}%)`, 14, yPos);
        yPos += 7;
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
      });
      
      doc.save(`Chill-outs_Rapport_${new Date().toISOString().split('T')[0]}.pdf`);
    }
  };

  const resetFilters = () => {
    setFilters({
      klas: '',
      student: '',
      dateFrom: '',
      dateTo: '',
      generatedBy: '',
    });
  };

  if (!mounted) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <Navigation />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-xl text-brand-black">Laden...</div>
        </div>
      </div>
    );
  }

  const pieData = [
    { name: 'VR', value: stats.totalVR, color: COLORS.vr },
    { name: 'VL', value: stats.totalVL, color: COLORS.vl },
    { name: 'Generiek', value: stats.totalGeneric, color: COLORS.generic },
  ].filter(item => item.value > 0);

  const hasActiveFilters = filters.klas || filters.student || filters.dateFrom || filters.dateTo;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96 bg-white/60 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-white/60 rounded-full blur-3xl"></div>
      </div>
      <Navigation />
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header met export knoppen */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold text-brand-black mb-2">Rapporten & Export</h1>
            <p className="text-brand-black/90">Visualiseer statistieken en exporteer rapporten</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportToExcel}
              className="px-6 py-3 bg-brand-green text-brand-black rounded-lg hover:bg-emerald-600 font-semibold transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exporteer Excel
            </button>
            <button
              onClick={exportToPDF}
              className="px-6 py-3 bg-red-500 text-brand-black rounded-lg hover:bg-red-600 font-semibold transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Exporteer PDF
            </button>
          </div>
        </div>

        {/* Filter sectie */}
        <div className="glass-effect rounded-lg p-6 border border-brand-gray/30 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-brand-black">Filters</h2>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-4 py-2 bg-gray-600 text-brand-black rounded-lg hover:bg-gray-700 text-sm transition-colors"
              >
                Reset Filters
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Klas filter */}
            <div>
              <label className="block text-sm font-medium text-brand-black/90 mb-2">Klas</label>
              <select
                value={filters.klas}
                onChange={(e) => setFilters(prev => ({ ...prev, klas: e.target.value, student: '' }))}
                className="w-full px-4 py-2 bg-white/60 border border-white/20 rounded-lg text-brand-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Alle klassen</option>
                {allKlassen.map(klas => (
                  <option key={klas} value={klas} className="bg-blue-900">{klas}</option>
                ))}
              </select>
            </div>

            {/* Student filter */}
            <div>
              <label className="block text-sm font-medium text-brand-black/90 mb-2">Student</label>
              <select
                value={filters.student}
                onChange={(e) => setFilters(prev => ({ ...prev, student: e.target.value }))}
                disabled={!filters.klas}
                className="w-full px-4 py-2 bg-white/60 border border-white/20 rounded-lg text-brand-black focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Alle studenten</option>
                {filteredStudents.map(student => (
                  <option key={student.id} value={student.id} className="bg-blue-900">{student.name}</option>
                ))}
              </select>
            </div>

            {/* Van datum */}
            <div>
              <label className="block text-sm font-medium text-brand-black/90 mb-2">Van Datum</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="w-full px-4 py-2 bg-white/60 border border-white/20 rounded-lg text-brand-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Tot datum */}
            <div>
              <label className="block text-sm font-medium text-brand-black/90 mb-2">Tot Datum</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                min={filters.dateFrom}
                className="w-full px-4 py-2 bg-white/60 border border-white/20 rounded-lg text-brand-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Gegenereerd door */}
            <div>
              <label className="block text-sm font-medium text-brand-black/90 mb-2">Gegenereerd door</label>
              <input
                type="text"
                value={filters.generatedBy}
                onChange={(e) => setFilters(prev => ({ ...prev, generatedBy: e.target.value }))}
                placeholder="Naam van gebruiker"
                className="w-full px-4 py-2 bg-white/60 border border-white/20 rounded-lg text-brand-black placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Hoofdstatistieken */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-effect rounded-lg p-6 border border-brand-gray/30">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-brand-black/85 uppercase">Totaal</p>
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-black text-brand-black">{stats.totalChillOuts}</p>
            <p className="text-xs text-brand-black/60 mt-1">chill-outs</p>
          </div>

          <div className="glass-effect rounded-lg p-6 border border-brand-gray/30">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-brand-black/85 uppercase">VR</p>
              <div className="w-10 h-10 rounded-lg bg-brand-blue/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-black text-blue-200">{stats.totalVR}</p>
            <p className="text-xs text-brand-black/60 mt-1">
              {stats.totalChillOuts > 0 ? Math.round((stats.totalVR / stats.totalChillOuts) * 100) : 0}%
            </p>
          </div>

          <div className="glass-effect rounded-lg p-6 border border-brand-gray/30">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-brand-black/85 uppercase">VL</p>
              <div className="w-10 h-10 rounded-lg bg-brand-green/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-black text-emerald-200">{stats.totalVL}</p>
            <p className="text-xs text-brand-black/60 mt-1">
              {stats.totalChillOuts > 0 ? Math.round((stats.totalVL / stats.totalChillOuts) * 100) : 0}%
            </p>
          </div>

          <div className="glass-effect rounded-lg p-6 border border-brand-gray/30">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-brand-black/85 uppercase">Generiek</p>
              <div className="w-10 h-10 rounded-lg bg-gray-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-black text-brand-black/90">{stats.totalGeneric}</p>
            <p className="text-xs text-brand-black/60 mt-1">
              {stats.totalChillOuts > 0 ? Math.round((stats.totalGeneric / stats.totalChillOuts) * 100) : 0}%
            </p>
          </div>
        </div>

        {/* Grafieken */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Distributie grafiek */}
          {pieData.length > 0 && (
            <div className="glass-effect rounded-lg p-6 border border-brand-gray/30">
              <h2 className="text-xl font-bold mb-4 text-brand-black">Distributie Chill-outs</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(1)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Grafiek per lesuur */}
          <div className="glass-effect rounded-lg p-6 border border-brand-gray/30">
            <h2 className="text-xl font-bold mb-4 text-brand-black">Chill-outs per Lesuur</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.byHour}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="hour" stroke="rgba(255,255,255,0.7)" />
                <YAxis stroke="rgba(255,255,255,0.7)" />
                <Tooltip contentStyle={{ backgroundColor: '#1e3a8a', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#fff' }} />
                <Legend />
                <Bar dataKey="vr" fill={COLORS.vr} name="VR" />
                <Bar dataKey="vl" fill={COLORS.vl} name="VL" />
                <Bar dataKey="generic" fill={COLORS.generic} name="Generiek" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Grafiek per klas */}
          <div className="glass-effect rounded-lg p-6 border border-brand-gray/30">
            <h2 className="text-xl font-bold mb-4 text-brand-black">Chill-outs per Klas</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.byKlas.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis type="number" stroke="rgba(255,255,255,0.7)" />
                <YAxis dataKey="klas" type="category" stroke="rgba(255,255,255,0.7)" width={100} />
                <Tooltip contentStyle={{ backgroundColor: '#1e3a8a', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#fff' }} />
                <Legend />
                <Bar dataKey="vr" fill={COLORS.vr} name="VR" />
                <Bar dataKey="vl" fill={COLORS.vl} name="VL" />
                <Bar dataKey="generic" fill={COLORS.generic} name="Generiek" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Dagelijkse trend grafiek */}
          {stats.byDay.length > 0 && (
            <div className="glass-effect rounded-lg p-6 border border-brand-gray/30">
              <h2 className="text-xl font-bold mb-4 text-brand-black">Tendens</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.byDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.7)" angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="rgba(255,255,255,0.7)" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e3a8a', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#fff' }} />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke={COLORS.total} strokeWidth={2} name="Totaal" />
                  <Line type="monotone" dataKey="vr" stroke={COLORS.vr} strokeWidth={2} name="VR" />
                  <Line type="monotone" dataKey="vl" stroke={COLORS.vl} strokeWidth={2} name="VL" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Gedetailleerde tabel per klas */}
        {stats.byKlas.length > 0 && (
          <div className="glass-effect rounded-lg p-6 border border-brand-gray/30 mb-8">
            <h2 className="text-xl font-bold mb-4 text-brand-black">Statistieken per Klas</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/20 bg-white/60">
                    <th className="px-4 py-3 text-left font-semibold text-brand-black">Klas</th>
                    <th className="px-4 py-3 text-center font-semibold text-brand-black">Totaal</th>
                    <th className="px-4 py-3 text-center font-semibold text-brand-black">VR</th>
                    <th className="px-4 py-3 text-center font-semibold text-brand-black">VL</th>
                    <th className="px-4 py-3 text-center font-semibold text-brand-black">Generiek</th>
                    <th className="px-4 py-3 text-center font-semibold text-brand-black">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byKlas.map((klas, index) => (
                    <tr key={klas.klas} className="border-b border-white/10 hover:bg-white/60 transition-colors">
                      <td className="px-4 py-3 font-medium text-brand-black">{klas.klas}</td>
                      <td className="px-4 py-3 text-center text-brand-black">{klas.total}</td>
                      <td className="px-4 py-3 text-center text-blue-200">{klas.vr}</td>
                      <td className="px-4 py-3 text-center text-emerald-200">{klas.vl}</td>
                      <td className="px-4 py-3 text-center text-brand-black/90">{klas.generic}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-24 bg-white/60 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                              style={{ width: `${klas.percentage}%` }}
                            />
                          </div>
                          <span className="text-brand-black font-semibold">{klas.percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tabel per student */}
        {stats.byStudent.length > 0 && (
          <div className="glass-effect rounded-lg p-6 border border-brand-gray/30">
            <h2 className="text-xl font-bold mb-4 text-brand-black">Statistieken per Student</h2>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-blue-900/50 backdrop-blur">
                  <tr className="border-b border-white/20">
                    <th className="px-4 py-3 text-left font-semibold text-brand-black">Naam</th>
                    <th className="px-4 py-3 text-left font-semibold text-brand-black">Klas</th>
                    <th className="px-4 py-3 text-center font-semibold text-brand-black">Totaal</th>
                    <th className="px-4 py-3 text-center font-semibold text-brand-black">VR</th>
                    <th className="px-4 py-3 text-center font-semibold text-brand-black">VL</th>
                    <th className="px-4 py-3 text-center font-semibold text-brand-black">Generiek</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byStudent.map((student) => (
                    <tr key={`${student.klas}-${student.name}`} className="border-b border-white/10 hover:bg-white/60 transition-colors">
                      <td className="px-4 py-2 font-medium text-brand-black">{student.name}</td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-0.5 bg-white/20 rounded text-xs text-brand-black">{student.klas}</span>
                      </td>
                      <td className="px-4 py-2 text-center font-semibold text-brand-black">{student.total}</td>
                      <td className="px-4 py-2 text-center text-blue-200 font-medium">{student.vr}</td>
                      <td className="px-4 py-2 text-center text-emerald-200 font-medium">{student.vl}</td>
                      <td className="px-4 py-2 text-center text-brand-black/90">{student.generic}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
