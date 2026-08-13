-- Nablijven-toegang: iedereen beperkt (kalender + dashboard),
-- behalve Admin en Annelore Delbecque (volledig).
-- Uitvoeren in Supabase SQL Editor indien nodig als herhaalbare migratie.

-- Iedereen: portal aan, volledig uit
UPDATE users
SET
  permissions = jsonb_set(
    jsonb_set(
      COALESCE(permissions, '{}'::jsonb),
      '{portal_detentions}',
      'true'::jsonb,
      true
    ),
    '{detentions_full}',
    'false'::jsonb,
    true
  ),
  updated_at = NOW()
WHERE username NOT IN ('Admin', 'annelore.delbecque')
  AND role <> 'admin';

-- Admin + Annelore: volledig
UPDATE users
SET
  permissions = jsonb_set(
    jsonb_set(
      COALESCE(permissions, '{}'::jsonb),
      '{portal_detentions}',
      'true'::jsonb,
      true
    ),
    '{detentions_full}',
    'true'::jsonb,
    true
  ),
  updated_at = NOW()
WHERE username IN ('Admin', 'annelore.delbecque')
   OR role = 'admin';
