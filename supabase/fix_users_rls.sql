-- Zorg dat de app (anon key) gebruikers kan beheren.
-- Voer uit in Supabase SQL Editor als updates/verwijderen 0 rijen raken.

DROP POLICY IF EXISTS "Allow all operations on users" ON public.users;

CREATE POLICY "Allow all operations on users"
  ON public.users
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
