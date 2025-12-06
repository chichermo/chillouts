import { DailyRecord, WeeklyTotal, Student, ChillOutType } from '@/types';

export function formatDate(date: Date | string): string {
  if (typeof date === 'string') {
    return date;
  }
  return date.toISOString().split('T')[0];
}

export function getDayName(date: Date): string {
  const days = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
  return days[date.getDay()];
}

export function formatDateDisplay(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dayName = getDayName(dateObj);
  return `${day}-${month} ${dayName}`;
}

export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function getWeekStartDate(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Aanpassen zodat maandag de eerste dag is
  return new Date(d.setDate(diff));
}

export function calculateDailyTotals(record: DailyRecord, students: Student[]): {
  totals: { [hour: number]: number };
  vr: { [hour: number]: number };
  vl: { [hour: number]: number };
} {
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
      const entries = studentEntries[hour];
      
      // Behandel zowel oud formaat (object) als nieuw formaat (array)
      if (Array.isArray(entries)) {
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
      } else if (entries && !Array.isArray(entries)) {
        // Oud formaat (compatibiliteit)
        const oldEntry = entries as { count: number; type: ChillOutType | null };
        if (oldEntry.count > 0) {
          totals[hour] += oldEntry.count;
          if (oldEntry.type === 'VR') {
            vr[hour] += oldEntry.count;
          } else if (oldEntry.type === 'VL') {
            vl[hour] += oldEntry.count;
          }
        }
      }
    });
  });

  return { totals, vr, vl };
}

export function calculateWeeklyTotals(
  weekNumber: number,
  startDate: Date,
  dailyRecords: { [date: string]: DailyRecord },
  students: Student[]
): WeeklyTotal {
  const totals: WeeklyTotal['totals'] = {};
  const weekDays = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag'];
  
  // Verkrijg alle unieke klassen
  const klassen = [...new Set(students.map(s => s.klas))];
  
  // Initialiseer structuur
  klassen.forEach(klas => {
    totals[klas] = {};
    weekDays.forEach(day => {
      totals[klas][day] = { total: 0, vr: 0, vl: 0 };
    });
  });

  // Bereken totalen per dag
  for (let i = 0; i < 5; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    const dateStr = formatDate(currentDate);
    const record = dailyRecords[dateStr];
    
    if (record) {
      const dayName = weekDays[i];
      const dailyTotals = calculateDailyTotals(record, students);
      
      // Groepeer per klas
      klassen.forEach(klas => {
        const klasStudents = students.filter(s => s.klas === klas);
        let klasTotal = 0;
        let klasVR = 0;
        let klasVL = 0;
        
      klasStudents.forEach(student => {
        const studentEntries = record.entries[student.id] || {};
        Object.values(studentEntries).forEach(entries => {
          // Behandel zowel oud formaat (object) als nieuw formaat (array)
          if (Array.isArray(entries)) {
            entries.forEach(entry => {
              if (entry) {
                klasTotal += 1;
                if (entry.type === 'VR') {
                  klasVR += 1;
                } else if (entry.type === 'VL') {
                  klasVL += 1;
                }
                // Generieke chill-outs (type === null) worden geteld in klasTotal maar niet in VR/VL
              }
            });
          } else if (entries && !Array.isArray(entries)) {
            // Oud formaat (compatibiliteit)
            const oldEntry = entries as { count: number; type: ChillOutType | null };
            if (oldEntry.count > 0) {
              klasTotal += oldEntry.count;
              if (oldEntry.type === 'VR') {
                klasVR += oldEntry.count;
              } else if (oldEntry.type === 'VL') {
                klasVL += oldEntry.count;
              }
            }
          }
        });
      });
        
        totals[klas][dayName] = {
          total: klasTotal,
          vr: klasVR,
          vl: klasVL,
        };
      });
    }
  }

  return {
    weekNumber,
    startDate: formatDate(startDate),
    totals,
  };
}

