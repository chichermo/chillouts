-- Tabla roosters (timetables): docent per klas, dag en lesuur
-- year: schooljaar bv. "2025-2026"
-- klas: klasnaam (moet overeenkomen met student.klas)
-- slots: JSONB met keys "dayIndex_hour" (0=Ma, 1=Di, 2=Wo, 3=Do, 4=Vr; hour 1-7)
CREATE TABLE IF NOT EXISTS timetables (
  id TEXT PRIMARY KEY,
  year TEXT NOT NULL,
  klas TEXT NOT NULL,
  slots JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(year, klas)
);

CREATE INDEX IF NOT EXISTS idx_timetables_year ON timetables(year);
CREATE INDEX IF NOT EXISTS idx_timetables_klas ON timetables(klas);

CREATE TRIGGER update_timetables_updated_at BEFORE UPDATE ON timetables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on timetables" ON timetables
  FOR ALL USING (true) WITH CHECK (true);
