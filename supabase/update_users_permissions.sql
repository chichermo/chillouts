-- Script SQL para actualizar los permisos de todos los usuarios según la lista proporcionada
-- Ejecuta este script en Supabase SQL Editor para corregir los permisos

-- Full Access: julie.gérard, liesbeth.kreps, annelore.delbecque
UPDATE users SET
  role = 'full_access',
  permissions = '{"dagelijks":true,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":true,"audit":false}'::jsonb,
  updated_at = NOW()
WHERE username IN ('julie.gérard', 'liesbeth.kreps', 'annelore.delbecque');

-- Access to dagelijks / weekoverzicht / statistieken / rapporten:
-- lisa.floré, yves.vanhoeserlande, dennie.viaene, jasmien.dantschotter, peter.laloo, warre.ballegeer, dimitri.bottelberghe
UPDATE users SET
  role = 'dagelijks_access',
  permissions = '{"dagelijks":true,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  updated_at = NOW()
WHERE username IN (
  'lisa.floré',
  'yves.vanhoeserlande',
  'dennie.viaene',
  'jasmien.dantschotter',
  'peter.laloo',
  'warre.ballegeer',
  'dimitri.bottelberghe'
);

-- Access to weekoverzicht/statistieken/rapporten:
-- Todos los demás usuarios de la lista
UPDATE users SET
  role = 'reports_access',
  permissions = '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  updated_at = NOW()
WHERE username IN (
  'gert.arickx',
  'manon.baert',
  'axel.barbier',
  'nicolas.boi',
  'loes.coudeville',
  'annie.debrabander',
  'nelia.decloedt',
  'jordin.decorte',
  'lorenzo.degrande',
  'saskia.delarue',
  'koen.deleu',
  'deborah.denys',
  'emma.depachter',
  'elke.derycke',
  'maaike.desmedt',
  'amelie.dewinter',
  'jutta.dewolf',
  'sirana.diet',
  'benoît.donche',
  'sven.geldof',
  'pascale.huart',
  'wout.leber',
  'anastasia.madan',
  'zoë.maes',
  'aaron.matthys',
  'brecht.merlevede',
  'sabine.mettepenningen',
  'eden.ramon',
  'eva.ranson',
  'kim.rosseel',
  'Jeroen.tant',
  'leontine.vandenbussche',
  'daniek.vanhelsuwé',
  'jana.vannevel',
  'thieme.vanruymbeke',
  'jessie.verhaeghe',
  'lisa.verschuere',
  'stephanie.zanetic',
  'pieter-jan.vanhollebeke'
);

