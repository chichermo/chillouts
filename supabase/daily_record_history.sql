-- Backup van dagrecords vóór elke update (uit Dagelijks)
-- Voer uit in Supabase SQL Editor als de tabel nog niet bestaat.

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
