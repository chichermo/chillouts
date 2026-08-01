-- ============================================================
-- DEPRECATED para proyecto compartido.
-- Usa en su lugar: supabase/shared_element_project.sql
-- (tablas nablijven_* + o2_incidenten en el proyecto Chill Outs)
-- ============================================================

-- Schema legacy (nombres sin prefijo). No usar si Chill Outs ya tiene
-- la tabla public.students (otro dominio).
-- ============================================================

-- Tabla detentions (nablijven)
CREATE TABLE IF NOT EXISTS public.detentions (
  id TEXT PRIMARY KEY,
  number INTEGER NOT NULL,
  date TEXT NOT NULL,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('MAANDAG', 'DINSDAG', 'DONDERDAG')),
  student TEXT NOT NULL,
  teacher TEXT,
  reason TEXT,
  task TEXT,
  lvs_date TEXT,
  should_print BOOLEAN DEFAULT FALSE,
  can_use_chromebook BOOLEAN DEFAULT FALSE,
  extra_notes TEXT,
  is_double_period BOOLEAN DEFAULT FALSE,
  time_period TEXT,
  nablijven_geweigerd BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_detentions_date ON public.detentions(date);
CREATE INDEX IF NOT EXISTS idx_detentions_day_of_week ON public.detentions(day_of_week);
CREATE INDEX IF NOT EXISTS idx_detentions_number ON public.detentions(number);
CREATE INDEX IF NOT EXISTS idx_detentions_is_double_period ON public.detentions(is_double_period);
CREATE INDEX IF NOT EXISTS idx_detentions_time_period ON public.detentions(time_period);

-- Trigger updated_at (usa la función de chillapp si existe)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_detentions_updated_at ON public.detentions;
CREATE TRIGGER update_detentions_updated_at BEFORE UPDATE ON public.detentions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.detentions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon all on detentions" ON public.detentions;
CREATE POLICY "Allow anon all on detentions"
  ON public.detentions FOR ALL TO anon USING (true) WITH CHECK (true);
