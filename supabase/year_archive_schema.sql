-- Archief van afgesloten schooljaren (snapshot + metadata).
-- Optioneel: de app kan ook archiveren via app_settings als deze tabel nog niet bestaat.

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
  meta JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_school_year_archives_archived_at
  ON school_year_archives (archived_at DESC);

ALTER TABLE school_year_archives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on school_year_archives" ON school_year_archives;
CREATE POLICY "Allow all operations on school_year_archives" ON school_year_archives
  FOR ALL USING (true) WITH CHECK (true);
