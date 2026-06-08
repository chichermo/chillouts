-- Voer dit uit in Supabase SQL Editor (na schema.sql)
-- Maakt tabellen aan voor roosters (alle PC's) en gedeelde instellingen

-- === TIMETABLES (roosters / docenten) ===
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

DROP TRIGGER IF EXISTS update_timetables_updated_at ON timetables;
CREATE TRIGGER update_timetables_updated_at BEFORE UPDATE ON timetables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on timetables" ON timetables;
CREATE POLICY "Allow all operations on timetables" ON timetables
  FOR ALL USING (true) WITH CHECK (true);

-- === APP_SETTINGS (bv. volgorde klassen) ===
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

DROP TRIGGER IF EXISTS update_app_settings_updated_at ON app_settings;
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on app_settings" ON app_settings;
CREATE POLICY "Allow all operations on app_settings" ON app_settings
  FOR ALL USING (true) WITH CHECK (true);

-- === DAILY_RECORD_HISTORY (backup vóór elke wijziging) ===
CREATE TABLE IF NOT EXISTS daily_record_history (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  day_name TEXT,
  entries JSONB NOT NULL DEFAULT '{}',
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  source TEXT DEFAULT 'before_update'
);

CREATE INDEX IF NOT EXISTS idx_daily_record_history_date ON daily_record_history(date);
CREATE INDEX IF NOT EXISTS idx_daily_record_history_saved_at ON daily_record_history(saved_at DESC);

ALTER TABLE daily_record_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on daily_record_history" ON daily_record_history;
CREATE POLICY "Allow all operations on daily_record_history" ON daily_record_history
  FOR ALL USING (true) WITH CHECK (true);
