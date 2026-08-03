from pathlib import Path

p = Path("app/stats/page.tsx")
t = p.read_text(encoding="utf-8")

if "ChilloutStackedBarChart" not in t:
    t = t.replace(
        "import { DailyRecord } from '@/types';\n",
        "import { DailyRecord } from '@/types';\n"
        "import ChilloutStackedBarChart from '@/components/charts/ChilloutStackedBarChart';\n"
        "import StickyTableWrap from '@/components/StickyTableWrap';\n"
        "import { CHILLOUT_CHART_COLORS } from '@/lib/chartTheme';\n",
    )

old_hour_section = """          {/* Gráfico por hora */}
          <div className="glass-effect rounded-lg shadow-md p-4 border border-white/20">
            <h2 className="text-lg font-bold mb-3 text-white">Chill-outs per Lesuur</h2>
            <motion.div className="space-y-4">
              {[1, 2, 3, 4, 5, 6, 7].map(hour => {
                const hourData = stats.byHour[hour] || { total: 0, vr: 0, vl: 0, generic: 0 };
                const percentage = maxHourTotal > 0 ? (hourData.total / maxHourTotal) * 100 : 0;
                return (
                  <motion.div key={hour}>
                    <motion.div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-white">Lesuur {hour}</span>
                      <span className="text-sm font-bold text-white">{hourData.total}</span>
                    </motion.div>
                    <motion.div className="w-full bg-white/20 rounded-full h-6 overflow-hidden">
                      <motion.div className="flex h-full">
                        <motion.div
                          className="transition-all duration-500"
                          style={{ width: `${(hourData.vr / maxHourTotal) * 100}%`, backgroundColor: COLORS.vr }}
                          title={`VR: ${hourData.vr}`}
                        />
                        <motion.div
                          className="transition-all duration-500"
                          style={{ width: `${(hourData.vl / maxHourTotal) * 100}%`, backgroundColor: COLORS.vl }}
                          title={`VL: ${hourData.vl}`}
                        />
                        <motion.div
                          className="transition-all duration-500"
                          style={{ width: `${(hourData.generic / maxHourTotal) * 100}%`, backgroundColor: COLORS.generic }}
                          title={`Chillouts: ${hourData.generic}`}
                        />
                      </motion.div>
                    </motion.div>
                    <motion.div className="flex gap-4 mt-1 text-xs">
                      <span className="text-blue-200">VR: {hourData.vr}</span>
                      <span className="text-emerald-200">VL: {hourData.vl}</span>
                      <span style={{ color: COLORS.generic }}>Chillouts: {hourData.generic}</span>
                    </motion.div>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>"""

new_hour_section = """          <div className="glass-effect rounded-lg shadow-md p-4 border border-white/20">
            <h2 className="text-lg font-bold mb-3 text-white">Chill-outs per Lesuur</h2>
            <ChilloutStackedBarChart
              data={[1, 2, 3, 4, 5, 6, 7].map((hour) => {
                const h = stats.byHour[hour] || { total: 0, vr: 0, vl: 0, generic: 0 };
                return { label: `L${hour}`, vr: h.vr, vl: h.vl, generic: h.generic };
              })}
              layout="vertical"
              height={300}
              ariaLabel="Gestapelde balken chill-outs per lesuur"
            />
          </motion.div>"""

old_klas_section_start = """          {/* Gráfico por clase */}
          <motion.div className="glass-effect rounded-lg shadow-md p-4 border border-white/20">
            <h2 className="text-lg font-bold mb-3 text-white">Chill-outs per Klas</h2>
            <motion.div className="space-y-3 max-h-[400px] overflow-y-auto">"""

# read file and find klas section end - use simpler replace for hour only first

old_hour = old_hour_section.replace("motion.div", "div")
new_hour = new_hour_section.replace("motion.div", "div")

if old_hour in t:
    t = t.replace(old_hour, new_hour)
else:
    print("WARN: hour section not found")

# Klas - replace inner loop with chart
old_klas_inner = """            <motion.div className="space-y-3 max-h-[400px] overflow-y-auto">
              {Object.keys(stats.byKlas).sort((a, b) => stats.byKlas[b].total - stats.byKlas[a].total).map(klas => {
                const klasData = stats.byKlas[klas];
                const percentage = maxKlasTotal > 0 ? (klasData.total / maxKlasTotal) * 100 : 0;
                return (
                  <motion.div key={klas}>
                    <motion.div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-white">{klas}</span>
                      <span className="text-sm font-bold text-white">{klasData.total}</span>
                    </motion.div>
                    <motion.div className="w-full bg-white/20 rounded-full h-6 overflow-hidden">
                      <motion.div className="flex h-full">
                        <motion.div
                          className="transition-all duration-500"
                          style={{ width: `${(klasData.vr / maxKlasTotal) * 100}%`, backgroundColor: COLORS.vr }}
                          title={`VR: ${klasData.vr}`}
                        />
                        <motion.div
                          className="transition-all duration-500"
                          style={{ width: `${(klasData.vl / maxKlasTotal) * 100}%`, backgroundColor: COLORS.vl }}
                          title={`VL: ${klasData.vl}`}
                        />
                        <motion.div
                          className="transition-all duration-500"
                          style={{ width: `${(klasData.generic / maxKlasTotal) * 100}%`, backgroundColor: COLORS.generic }}
                          title={`Chillouts: ${klasData.generic}`}
                        />
                      </motion.div>
                    </motion.div>
                    <motion.div className="flex gap-4 mt-1 text-xs">
                      <span className="text-blue-200">VR: {klasData.vr}</span>
                      <span className="text-emerald-200">VL: {klasData.vl}</span>
                      <span style={{ color: COLORS.generic }}>Chillouts: {klasData.generic}</span>
                    </motion.div>
                  </motion.div>
                );
              })}
            </motion.div>"""

new_klas_inner = """            <ChilloutStackedBarChart
              data={Object.keys(stats.byKlas)
                .sort((a, b) => stats.byKlas[b].total - stats.byKlas[a].total)
                .map((klas) => {
                  const k = stats.byKlas[klas];
                  return { label: klas, vr: k.vr, vl: k.vl, generic: k.generic };
                })}
              layout="horizontal"
              height={Math.max(280, Object.keys(stats.byKlas).length * 36)}
              ariaLabel="Gestapelde balken chill-outs per klas"
            />"""

old_klas_inner = old_klas_inner.replace("motion.div", "div")
new_klas_inner = new_klas_inner.replace("motion.div", "div")

if old_klas_inner in t:
    t = t.replace(old_klas_inner, new_klas_inner)
else:
    print("WARN: klas section not found")

# Sticky student table
t = t.replace(
    '            <motion.div className="overflow-x-auto">',
    '            <StickyTableWrap>',
    1,
).replace("motion.div", "motion.div")
t = t.replace(
    '            <div className="overflow-x-auto">\n              <table className="w-full text-sm">',
    '            <StickyTableWrap>\n              <table className="w-full text-sm">',
    1,
)
t = t.replace(
    "              </table>\n            </motion.div>\n          </motion.div>\n        )}\n      </motion.div>",
    "              </table>\n            </StickyTableWrap>\n          </motion.div>\n        )}\n      </motion.div>",
    1,
)
t = t.replace(
    "              </table>\n            </div>\n          </div>\n        )}\n      </motion.div>",
    "              </table>\n            </StickyTableWrap>\n          </motion.div>\n        )}\n      </motion.div>",
    1,
)

# Use CHILLOUT_CHART_COLORS alias optional - keep COLORS
t = t.replace("motion.div", "div")

# Remove unused max vars if we want - keep for now, eslint might warn

p.write_text(t, encoding="utf-8")
print("stats ok")
