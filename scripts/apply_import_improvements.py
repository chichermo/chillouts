# -*- coding: utf-8 -*-
"""Apply Rapporten improvements without manual edit errors."""

from pathlib import Path

p = Path("app/import/page.tsx")
t = p.read_text(encoding="utf-8")

# 1. Imports
if "LesuurPerDagBarChart" not in t:
    t = t.replace(
        "import jsPDF from 'jspdf';\n",
        "import jsPDF from 'jspdf';\n"
        "import LesuurPerDagBarChart from '@/components/charts/LesuurPerDagBarChart';\n"
        "import DayHourHeatmap from '@/components/charts/DayHourHeatmap';\n"
        "import StickyTableWrap from '@/components/StickyTableWrap';\n"
        "import { BAR_TOP_RADIUS, CHART_AXIS_TICK, CHART_GRID_STROKE, CHART_TOOLTIP_STYLE } from '@/lib/chartTheme';\n"
        "import { loadTimetables, getSchoolYear, getTeacherForSlot } from '@/lib/timetables';\n"
        "import type { Timetable } from '@/types';\n",
    )

# 2. Remove duplicate timetable helpers
old_helpers = """type Timetable = {
  klas: string;
  slots: Record<string, string>;
};

const getSchoolYear = (date: Date): string => {
  const y = date.getFullYear();
  return date.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
};

const getTeacherForSlot = (slots: Record<string, string>, date: Date, hour: number): string => {
  const day = date.getDay(); // 0=Sun, 1=Mon, ... 5=Fri
  if (day === 0 || day > 5) return '';
  const dayIndex = day - 1; // Mon=0 ... Fri=4
  return slots[`${dayIndex}_${hour}`] || '';
};

const loadTimetables = async (year: string): Promise<Timetable[]> => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`chillapp_timetables_${year}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

"""
if old_helpers in t:
    t = t.replace(old_helpers, "")

# 3. Export heatmap
if "chart-heatmap" not in t:
    t = t.replace(
        "        { id: 'chart-lesuur-dag', title: 'Chill-outs per Lesuur per Dag' },\n      ];",
        "        { id: 'chart-lesuur-dag', title: 'Chill-outs per Lesuur per Dag' },\n"
        "        { id: 'chart-heatmap', title: 'Heatmap Dag x Lesuur' },\n      ];",
    )

# 4. Filter chips before charts
chips = """
        {hasActiveFilters && (
          <motion.div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-xs font-medium text-white/55 uppercase tracking-wide w-full sm:w-auto">
              Actieve filters
            </span>
            {appliedFilters.klas && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/25 text-blue-100 border border-blue-400/30">
                Klas: {appliedFilters.klas}
              </span>
            )}
            {appliedFilters.student && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/25 text-purple-100 border border-purple-400/30">
                Student: {stats.byStudent.find((s) => s.name)?.name || appliedFilters.student}
              </span>
            )}
            {appliedFilters.hour && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-500/25 text-amber-100 border border-amber-400/30">
                Lesuur {appliedFilters.hour}
              </span>
            )}
            {appliedFilters.weekday && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/25 text-emerald-100 border border-emerald-400/30">
                {appliedFilters.weekday}
              </span>
            )}
            {(appliedFilters.dateFrom || appliedFilters.dateTo) && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white/90 border border-white/20">
                {appliedFilters.dateFrom || '…'} – {appliedFilters.dateTo || '…'}
              </span>
            )}
            <button
              type="button"
              onClick={resetFilters}
              className="px-3 py-1 rounded-full text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 border border-white/15 transition-colors"
            >
              Alles wissen
            </button>
          </motion.div>
        )}

        {/* Grafieken */}"""
chips = chips.replace("motion.div", "div")

marker = "        {/* Grafieken */}\n        <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8\">"
if "Actieve filters" not in t and marker in t:
    t = t.replace(marker, chips + "\n        <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8\">")

# 5. Pie tooltip
t = t.replace(
    "<Tooltip contentStyle={{ backgroundColor: '#2a2a3a', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#fff' }} />",
    "<Tooltip contentStyle={CHART_TOOLTIP_STYLE} />",
)

# 6. Lesuur bar chart styling
old_lesuur_chart = """                <BarChart data={stats.byHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="hour" stroke="rgba(255,255,255,0.7)" />
                  <YAxis stroke="rgba(255,255,255,0.7)" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e3a8a', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#fff' }} />
                  <Legend />
                  <Bar dataKey="vr" fill={COLORS.vr} name="VR" isAnimationActive={!isExportingCharts} />
                  <Bar dataKey="vl" fill={COLORS.vl} name="VL" isAnimationActive={!isExportingCharts} />
                  <Bar dataKey="generic" fill={COLORS.generic} name="Chillouts" isAnimationActive={!isExportingCharts} />
                </BarChart>"""

new_lesuur_chart = """                <BarChart data={stats.byHour} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="22%">
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
                  <XAxis dataKey="hour" stroke="transparent" tick={CHART_AXIS_TICK} />
                  <YAxis stroke="transparent" tick={CHART_AXIS_TICK} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.06)' }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }} />
                  <Bar dataKey="vr" fill={COLORS.vr} name="VR" radius={BAR_TOP_RADIUS} maxBarSize={40} isAnimationActive={!isExportingCharts} />
                  <Bar dataKey="vl" fill={COLORS.vl} name="VL" radius={BAR_TOP_RADIUS} maxBarSize={40} isAnimationActive={!isExportingCharts} />
                  <Bar dataKey="generic" fill={COLORS.generic} name="Chillouts" radius={BAR_TOP_RADIUS} maxBarSize={40} isAnimationActive={!isExportingCharts} />
                </BarChart>"""
if old_lesuur_chart in t:
    t = t.replace(old_lesuur_chart, new_lesuur_chart)

# 7. Klas vertical chart
old_klas = """                <BarChart data={klasChartData} layout="vertical" margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis type="number" stroke="rgba(255,255,255,0.7)" />
                  <YAxis
                    dataKey="klas"
                    type="category"
                    stroke="rgba(255,255,255,0.7)"
                    width={klasYAxisWidth}
                    interval={0}
                  />
                  <Tooltip contentStyle={{ backgroundColor: '#1e3a8a', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#fff' }} />
                  <Legend />
                  <Bar dataKey="vr" fill={COLORS.vr} name="VR" isAnimationActive={!isExportingCharts} />
                  <Bar dataKey="vl" fill={COLORS.vl} name="VL" isAnimationActive={!isExportingCharts} />
                  <Bar dataKey="generic" fill={COLORS.generic} name="Chillouts" isAnimationActive={!isExportingCharts} />
                </BarChart>"""

new_klas = """                <BarChart data={klasChartData} layout="vertical" margin={{ left: 10, right: 20, top: 10, bottom: 10 }} barCategoryGap="18%">
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} horizontal={false} />
                  <XAxis type="number" stroke="transparent" tick={CHART_AXIS_TICK} allowDecimals={false} />
                  <YAxis
                    dataKey="klas"
                    type="category"
                    stroke="transparent"
                    tick={CHART_AXIS_TICK}
                    width={klasYAxisWidth}
                    interval={0}
                  />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.06)' }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }} />
                  <Bar dataKey="vr" fill={COLORS.vr} name="VR" radius={[0, 6, 6, 0]} maxBarSize={22} isAnimationActive={!isExportingCharts} />
                  <Bar dataKey="vl" fill={COLORS.vl} name="VL" radius={[0, 6, 6, 0]} maxBarSize={22} isAnimationActive={!isExportingCharts} />
                  <Bar dataKey="generic" fill={COLORS.generic} name="Chillouts" radius={[0, 6, 6, 0]} maxBarSize={22} isAnimationActive={!isExportingCharts} />
                </BarChart>"""
if old_klas in t:
    t = t.replace(old_klas, new_klas)

# 8. Tendens line chart
old_tendens = """                <LineChart data={stats.byDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.7)" angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="rgba(255,255,255,0.7)" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e3a8a', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#fff' }} />"""

new_tendens = """                <LineChart data={stats.byDay} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
                  <XAxis dataKey="date" stroke="transparent" tick={CHART_AXIS_TICK} angle={-35} textAnchor="end" height={72} />
                  <YAxis stroke="transparent" tick={CHART_AXIS_TICK} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />"""
if old_tendens in t:
    t = t.replace(old_tendens, new_tendens)

# 9. Replace lesuur-dag line chart block
old_day_hour = """          {/* Nuevo gráfico: Chill-outs per Lesuur over Time */}
          {stats.byDayAndHour && stats.byDayAndHour.length > 0 && (
            <div id="chart-lesuur-dag" className="glass-effect rounded-lg p-6 border border-white/20">
              <h2 className="text-xl font-bold mb-4 text-white">
                {appliedFilters.student 
                  ? `Chill-outs per Lesuur per Dag - ${stats.byStudent.find(s => s.name)?.name || 'Student'}`
                  : appliedFilters.klas
                  ? `Chill-outs per Lesuur per Dag - ${appliedFilters.klas}`
                  : 'Chill-outs per Lesuur per Dag'}
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.byDayAndHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.7)" angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="rgba(255,255,255,0.7)" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e3a8a', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#fff' }} />
                  <Legend />
                  <Line type="monotone" dataKey="1" stroke="#3b82f6" strokeWidth={2} name="Lesuur 1" dot={{ r: 3 }} isAnimationActive={!isExportingCharts} />
                  <Line type="monotone" dataKey="2" stroke="#10b981" strokeWidth={2} name="Lesuur 2" dot={{ r: 3 }} isAnimationActive={!isExportingCharts} />
                  <Line type="monotone" dataKey="3" stroke="#f59e0b" strokeWidth={2} name="Lesuur 3" dot={{ r: 3 }} isAnimationActive={!isExportingCharts} />
                  <Line type="monotone" dataKey="4" stroke="#ef4444" strokeWidth={2} name="Lesuur 4" dot={{ r: 3 }} isAnimationActive={!isExportingCharts} />
                  <Line type="monotone" dataKey="5" stroke="#8b5cf6" strokeWidth={2} name="Lesuur 5" dot={{ r: 3 }} isAnimationActive={!isExportingCharts} />
                  <Line type="monotone" dataKey="6" stroke="#ec4899" strokeWidth={2} name="Lesuur 6" dot={{ r: 3 }} isAnimationActive={!isExportingCharts} />
                  <Line type="monotone" dataKey="7" stroke="#06b6d4" strokeWidth={2} name="Lesuur 7" dot={{ r: 3 }} isAnimationActive={!isExportingCharts} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}"""

new_day_hour = """          {/* Chill-outs per lesuur per dag */}
          {stats.byDayAndHour && stats.byDayAndHour.length > 0 && (
            <motion.div id="chart-lesuur-dag" className="glass-effect rounded-lg p-6 border border-white/20 lg:col-span-2">
              <h2 className="text-xl font-bold mb-1 text-white">
                {appliedFilters.student
                  ? `Chill-outs per Lesuur per Dag - ${stats.byStudent.find((s) => s.name)?.name || 'Student'}`
                  : appliedFilters.klas
                    ? `Chill-outs per Lesuur per Dag - ${appliedFilters.klas}`
                    : 'Chill-outs per Lesuur per Dag'}
              </h2>
              <p className="text-xs text-white/55 mb-4">
                Gegroepeerde verticale balken per dag — elke kleur is een lesuur
              </p>
              <LesuurPerDagBarChart
                data={stats.byDayAndHour}
                isAnimationActive={!isExportingCharts}
                compact={isExportingCharts}
                ariaLabel="Chill-outs per lesuur per dag"
              />
            </motion.div>
          )}

          {stats.byDayAndHour && stats.byDayAndHour.length > 0 && (
            <motion.div id="chart-heatmap" className="glass-effect rounded-lg p-6 border border-white/20 lg:col-span-2">
              <h2 className="text-xl font-bold mb-1 text-white">Heatmap — Dag × Lesuur</h2>
              <p className="text-xs text-white/55 mb-4">Donkere kleur = meer chill-outs</p>
              <DayHourHeatmap data={stats.byDayAndHour} title="Heatmap chill-outs" />
            </motion.div>
          )}"""
new_day_hour = new_day_hour.replace("motion.div", "motion.div").replace("motion.div", "div")

if old_day_hour in t:
    t = t.replace(old_day_hour, new_day_hour)

# 10. Sticky tables
replacements = [
    (
        '            <div className="overflow-x-auto">\n              <table className="w-full text-sm">\n                <thead>\n                  <tr className="border-b border-white/20 bg-white/10">\n                    <th className="px-4 py-3 text-left font-semibold text-white">Klas</th>',
        '            <StickyTableWrap>\n              <table className="w-full text-sm">\n                <thead>\n                  <tr className="border-b border-white/20 bg-white/10">\n                    <th className="px-4 py-3 text-left font-semibold text-white">Klas</th>',
    ),
    (
        '            <div className="overflow-x-auto">\n              <table className="w-full text-sm">\n                <thead>\n                  <tr className="border-b border-white/20 bg-white/10">\n                    <th className="px-4 py-3 text-left font-semibold text-white">Docent</th>',
        '            <StickyTableWrap>\n              <table className="w-full text-sm">\n                <thead>\n                  <tr className="border-b border-white/20 bg-white/10">\n                    <th className="px-4 py-3 text-left font-semibold text-white">Docent</th>',
    ),
    (
        '            <motion.div className="overflow-x-auto max-h-[600px] overflow-y-auto">',
        '            <StickyTableWrap maxHeight="600px">',
    ),
]
for a, b in replacements:
    a = a.replace("motion.div", "div")
    b = b.replace("motion.div", "motion.div")
    if a in t:
        t = t.replace(a, b.replace("motion.div", "div"), 1)

t = t.replace(
    '            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">',
    '            <StickyTableWrap maxHeight="600px">',
    1,
)

# Close sticky wrappers (3x)
t = t.replace(
    "              </table>\n            </div>\n          </div>\n        )}\n\n        {/* Chill-outs per Docent",
    "              </table>\n            </StickyTableWrap>\n          </div>\n        )}\n\n        {/* Chill-outs per Docent",
    1,
)
t = t.replace(
    "              </table>\n            </motion.div>\n          </motion.div>\n        )}\n\n        {/* Tabel per student",
    "              </table>\n            </StickyTableWrap>\n          </motion.div>\n        )}\n\n        {/* Tabel per student",
    1,
).replace("motion.div", "div")

t = t.replace(
    "              </table>\n            </div>\n          </div>\n        )}\n      </div>",
    "              </table>\n            </StickyTableWrap>\n          </div>\n        )}\n      </div>",
    1,
)

t = t.replace("motion.div", "div")

p.write_text(t, encoding="utf-8")
print("import page updated, length", len(t))
