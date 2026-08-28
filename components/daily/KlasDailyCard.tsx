'use client';

import { Student, ChillOutType } from '@/types';
import type { Timetable } from '@/types';
import {
  getTeacherForSlot,
  findTimetableInMap,
} from '@/lib/timetables';
import LesuurColumnHeader from '@/components/daily/LesuurColumnHeader';
import StickyTableWrap from '@/components/StickyTableWrap';

type KlasDailyCardProps = {
  klas: string;
  students: Student[];
  dateStr: string;
  timetableMap: Record<string, Timetable>;
  selectedHour: number | null;
  isReadOnlyPast: boolean;
  onHourHover: (hour: number | null) => void;
  getChillOutCount: (studentId: string, hour: number, type: ChillOutType) => number;
  getGenericChillOutCount: (studentId: string, hour: number) => number;
  getTotalChillOuts: (studentId: string, hour: number) => number;
  onCheckboxChange: (
    studentId: string,
    hour: number,
    type: ChillOutType,
    targetCount: number,
    checked: boolean
  ) => void;
};

export default function KlasDailyCard({
  klas,
  students,
  dateStr,
  timetableMap,
  selectedHour,
  isReadOnlyPast,
  onHourHover,
  getChillOutCount,
  getGenericChillOutCount,
  getTotalChillOuts,
  onCheckboxChange,
}: KlasDailyCardProps) {
  const klasStudents = students.filter((s) => s.klas === klas);

  return (
    <div className="glass-effect p-6 rounded-xl shadow-lg border border-white/20">
      <h3 className="text-xl font-semibold mb-4 text-yellow-200 bg-gradient-to-r from-yellow-500/20 to-yellow-400/20 p-3 rounded-lg border-l-4 border-yellow-400/50">
        {klas}
      </h3>
      <StickyTableWrap>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-white/10">
              <th className="border border-white/20 px-2 py-1 text-left font-semibold text-xs text-white">Naam</th>
              {[1, 2, 3, 4, 5, 6, 7].map((hour) => (
                <LesuurColumnHeader
                  key={hour}
                  hour={hour}
                  teacher={getTeacherForSlot(
                    findTimetableInMap(timetableMap, klas)?.slots || {},
                    new Date(`${dateStr}T12:00:00`),
                    hour
                  )}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {klasStudents.map((student) => (
              <tr key={student.id} className="hover:bg-white/10 transition-colors">
                <td className="border border-white/20 px-2 py-1 font-medium text-xs text-white">{student.name}</td>
                {[1, 2, 3, 4, 5, 6, 7].map((hour) => {
                  const vrCount = getChillOutCount(student.id, hour, 'VR');
                  const vlCount = getChillOutCount(student.id, hour, 'VL');
                  const total = getTotalChillOuts(student.id, hour);

                  return (
                    <td
                      key={hour}
                      className={`border border-white/20 px-0.5 py-0.5 transition-all ${
                        selectedHour === hour ? 'bg-white/10 border-blue-400/50' : 'hover:bg-white/10'
                      }`}
                      onMouseEnter={() => onHourHover(hour)}
                      onMouseLeave={() => onHourHover(null)}
                    >
                      <div className="flex flex-col gap-0.5 items-center py-1">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-0.5 justify-center">
                            <span className="text-[9px] font-semibold text-blue-200 w-4 text-right">VR</span>
                            {[1].map((count) => {
                              const isChecked = vrCount >= count;
                              const vlCountCurrent = getChillOutCount(student.id, hour, 'VL');
                              const genericCount = getGenericChillOutCount(student.id, hour);
                              const canCheck = count + vlCountCurrent + genericCount <= 3;
                              return (
                                <label
                                  key={`vr-${count}`}
                                  className={`flex items-center cursor-pointer ${isChecked ? 'opacity-100' : 'opacity-40'}`}
                                  title={`VR ${count}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) =>
                                      onCheckboxChange(
                                        student.id,
                                        hour,
                                        'VR',
                                        e.target.checked ? count : count - 1,
                                        e.target.checked
                                      )
                                    }
                                    disabled={isReadOnlyPast || (!canCheck && !isChecked)}
                                    className="w-3 h-3 text-blue-600 border border-gray-400 rounded focus:ring-1 focus:ring-blue-500 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                                  />
                                </label>
                              );
                            })}
                          </div>

                          <div className="flex items-center gap-0.5 justify-center">
                            <span className="text-[9px] font-semibold text-emerald-200 w-4 text-right">VL</span>
                            {[1].map((count) => {
                              const isChecked = vlCount >= count;
                              const vrCountCurrent = getChillOutCount(student.id, hour, 'VR');
                              const genericCount = getGenericChillOutCount(student.id, hour);
                              const canCheck = count + vrCountCurrent + genericCount <= 3;
                              return (
                                <label
                                  key={`vl-${count}`}
                                  className={`flex items-center cursor-pointer ${isChecked ? 'opacity-100' : 'opacity-40'}`}
                                  title={`VL ${count}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) =>
                                      onCheckboxChange(
                                        student.id,
                                        hour,
                                        'VL',
                                        e.target.checked ? count : count - 1,
                                        e.target.checked
                                      )
                                    }
                                    disabled={isReadOnlyPast || (!canCheck && !isChecked)}
                                    className="w-3 h-3 text-green-600 border border-gray-400 rounded focus:ring-1 focus:ring-green-500 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                                  />
                                </label>
                              );
                            })}
                          </div>

                          <div className="flex items-center gap-0.5 justify-center">
                            <span className="text-[9px] font-semibold text-white/85 w-4 text-right">CO</span>
                            {[1, 2, 3].map((count) => {
                              const genericCount = getGenericChillOutCount(student.id, hour);
                              const isChecked = genericCount >= count;
                              const vrCountCurrent = getChillOutCount(student.id, hour, 'VR');
                              const vlCountCurrent = getChillOutCount(student.id, hour, 'VL');
                              const canCheck = count + vrCountCurrent + vlCountCurrent <= 3;
                              return (
                                <label
                                  key={`gen-${count}`}
                                  className={`flex items-center cursor-pointer ${isChecked ? 'opacity-100' : 'opacity-40'}`}
                                  title={`Chill-out ${count}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) =>
                                      onCheckboxChange(
                                        student.id,
                                        hour,
                                        null,
                                        e.target.checked ? count : count - 1,
                                        e.target.checked
                                      )
                                    }
                                    disabled={isReadOnlyPast || (!canCheck && !isChecked)}
                                    className="w-3 h-3 text-gray-600 border border-gray-400 rounded focus:ring-1 focus:ring-gray-500 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                                  />
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        {total > 0 && (
                          <span
                            className={`text-[9px] font-bold px-1 py-0 rounded ${
                              total >= 3
                                ? 'bg-red-500/30 text-red-200'
                                : total >= 2
                                  ? 'bg-yellow-500/30 text-yellow-200'
                                  : 'bg-white/20 text-white/90'
                            }`}
                          >
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
      </StickyTableWrap>
    </div>
  );
}
