-- Volledig schooljaar-archief: snapshot + genormaliseerde tabellen voor consultatie.
-- Gearchiveerde data is IMMUTABLE (alleen lezen via de app).

CREATE TABLE IF NOT EXISTS school_year_archives (
  year TEXT PRIMARY KEY,
  from_date TEXT NOT NULL,
  to_date TEXT NOT NULL,
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  archived_by TEXT,
  students_count INTEGER NOT NULL DEFAULT 0,
  records_count INTEGER NOT NULL DEFAULT 0,
  chillouts_total INTEGER NOT NULL DEFAULT 0,
  students JSONB NOT NULL DEFAULT '[]',
  daily_records JSONB NOT NULL DEFAULT '{}',
  timetables JSONB NOT NULL DEFAULT '[]',
  meta JSONB NOT NULL DEFAULT '{"immutable": true, "readonly": true}'
);

CREATE TABLE IF NOT EXISTS archived_students (
  year TEXT NOT NULL REFERENCES school_year_archives(year) ON DELETE RESTRICT,
  student_id TEXT NOT NULL,
  name TEXT NOT NULL,
  klas TEXT NOT NULL,
  status TEXT,
  PRIMARY KEY (year, student_id)
);

CREATE TABLE IF NOT EXISTS archived_daily_records (
  year TEXT NOT NULL REFERENCES school_year_archives(year) ON DELETE RESTRICT,
  date TEXT NOT NULL,
  day_name TEXT,
  entries JSONB NOT NULL DEFAULT '{}',
  PRIMARY KEY (year, date)
);

CREATE INDEX IF NOT EXISTS idx_archived_students_year_name
  ON archived_students (year, name);
CREATE INDEX IF NOT EXISTS idx_archived_students_year_klas
  ON archived_students (year, klas);
CREATE INDEX IF NOT EXISTS idx_archived_daily_records_year_date
  ON archived_daily_records (year, date);

CREATE INDEX IF NOT EXISTS idx_school_year_archives_archived_at
  ON school_year_archives (archived_at DESC);

ALTER TABLE school_year_archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_daily_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on school_year_archives" ON school_year_archives;
CREATE POLICY "Allow all operations on school_year_archives" ON school_year_archives
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on archived_students" ON archived_students;
CREATE POLICY "Allow all operations on archived_students" ON archived_students
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on archived_daily_records" ON archived_daily_records;
CREATE POLICY "Allow all operations on archived_daily_records" ON archived_daily_records
  FOR ALL USING (true) WITH CHECK (true);

-- Blokkeer UPDATE/DELETE op genormaliseerde archieftabellen (immutability in DB).
CREATE OR REPLACE FUNCTION prevent_archive_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Gearchiveerde gegevens zijn onwijzigbaar (alleen lezen).';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_archived_students_no_update ON archived_students;
CREATE TRIGGER trg_archived_students_no_update
  BEFORE UPDATE OR DELETE ON archived_students
  FOR EACH ROW EXECUTE FUNCTION prevent_archive_mutation();

DROP TRIGGER IF EXISTS trg_archived_daily_records_no_update ON archived_daily_records;
CREATE TRIGGER trg_archived_daily_records_no_update
  BEFORE UPDATE OR DELETE ON archived_daily_records
  FOR EACH ROW EXECUTE FUNCTION prevent_archive_mutation();

DROP TRIGGER IF EXISTS trg_school_year_archives_no_update ON school_year_archives;
CREATE TRIGGER trg_school_year_archives_no_update
  BEFORE UPDATE OR DELETE ON school_year_archives
  FOR EACH ROW EXECUTE FUNCTION prevent_archive_mutation();
