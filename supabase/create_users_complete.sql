-- Script completo para crear la tabla users e insertar todos los usuarios
-- Ejecuta este script completo en Supabase SQL Editor

-- Primero, crear la función para actualizar updated_at si no existe
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear la tabla users si no existe
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'full_access', 'dagelijks_access', 'reports_access')),
  permissions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  last_login TIMESTAMP WITH TIME ZONE,
  active BOOLEAN DEFAULT TRUE
);

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);

-- Crear trigger para actualizar updated_at si no existe
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Deshabilitar RLS temporalmente para poder insertar usuarios
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;
DROP POLICY IF EXISTS "Allow all operations on users" ON users;

-- Crear política temporal que permite todas las operaciones (para desarrollo)
CREATE POLICY "Allow all operations on users" ON users
    FOR ALL USING (true) WITH CHECK (true);

-- Habilitar RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Ahora insertar los usuarios

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_2i45gwxtn',
  'julie.gérard',
  'f43b8e2db9f62619dbf5a3cc5db53561e8b32535b67ee97b2f16a75dd47c201d',
  'full_access',
  '{"dagelijks":true,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":true,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_hijoxhlut',
  'liesbeth.kreps',
  'a1347c1cece2da6c4631b37f081dceca803fdc324cdda1496293849c843e81ec',
  'full_access',
  '{"dagelijks":true,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":true,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_4y5pwpmjc',
  'annelore.delbecque',
  '37cc6dded708205df31be0d94436f69973f911f97b6229a920652b48c21f2380',
  'full_access',
  '{"dagelijks":true,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":true,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_r9uu4n22y',
  'lisa.floré',
  'dac75feba65118556d494179be82a3b3bdec399b919e91ae80faffc675d2e688',
  'dagelijks_access',
  '{"dagelijks":true,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_iq9g8pohk',
  'yves.vanhoeserlande',
  'fce1cbe2b2a9e527c93063bf4911df469e6429d7e293005cf387ac2b4c04db9c',
  'dagelijks_access',
  '{"dagelijks":true,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_l1on19m1q',
  'dennie.viaene',
  '92561e0c548864ea22cedbddd59d2e584137a17505a1636d11b505d841ba81b9',
  'dagelijks_access',
  '{"dagelijks":true,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_b2a073ixt',
  'jasmien.dantschotter',
  '10a15ea64cdfc421aa657f0fb155c049ee77af92289c084623f08378570689c1',
  'dagelijks_access',
  '{"dagelijks":true,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_bokdpl4se',
  'peter.laloo',
  '2f19855d250f692e66d12754e9e2e81a8ddd36b2bdbf7fbdcd575f7ba66b5bc0',
  'dagelijks_access',
  '{"dagelijks":true,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_jgtwrk9xr',
  'warre.ballegeer',
  '509f91cc847af74d9f35177c294ea6cbfba3802653191f18a3a3023d2a43134c',
  'dagelijks_access',
  '{"dagelijks":true,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_80c83892e',
  'dimitri.bottelberghe',
  'eaf92143eb34d54dbae90ccc9762b9492d1e6c0fe376db296499e39efb7644dd',
  'dagelijks_access',
  '{"dagelijks":true,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_yp3v9xv5r',
  'gert.arickx',
  '7a3514b505633ac1b91726467e2712020f81baf9f6e22970a9530d4e66893858',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_4lks5lvp2',
  'manon.baert',
  '16324e1ac03be83f1f7db95374d30b2a90b07294928d53668effa490e04195be',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_qg6eyflu6',
  'axel.barbier',
  '58de632ff2aa29ccd2c21290a231f5823f197a0a7d9f04de07601e14e0efd850',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_n4ga1gcyy',
  'nicolas.boi',
  '63c0bac93ad97166816ef6f19887b221e6671659c5fb009beba1c946aa7a3e04',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_x04vojwgl',
  'loes.coudeville',
  '037ac18832330a4b8dfa7b7de8fb9e217cc97cced9629bb84797f51008485a19',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_8x0b88ygh',
  'annie.debrabander',
  'dbf66720cf2537b1a79b57b4377aff0c33b74db08466cd50f195b69de5f7fe8c',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_m45z3u69b',
  'nelia.decloedt',
  '879ab9d13dbbacb40349db345236f4f3bc7fcbdc0423d7809af976a2e4593dd8',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_hv6qaybek',
  'jordin.decorte',
  '51f5776a7441eb38da52a01e79fd4509453d7110f25e47247f935d2ac1efb6b4',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_5zlvier4q',
  'lorenzo.degrande',
  'e0c1cbaf2a4001b59d1259cc034945cbcb6da029cb3ce41a0a151e838ede46d9',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_wmr7sflu6',
  'saskia.delarue',
  '1b290cf53b4d2ec16f22885bd412e75086e2cbde0abce630413ecea3badda0ee',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_h178qi9ig',
  'koen.deleu',
  '1c137a1e5b72203d8e4081579902a949b8ba91fd9d9438090637bb018c961435',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_p1kxsvbr8',
  'deborah.denys',
  '433ba2e79c1e01ad38acaa0d49ad5e4b1a50f2685f1e77219262dbdaadf2aaf9',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_ztjbcdlxk',
  'emma.depachter',
  '0618e0d90e1da6474720b4fa8e1194309746a0f723b7884e628edf5b16cf46de',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_4oplz2qve',
  'elke.derycke',
  '520d7ce25c34bfe72ac8ac116a17dd79435b115a0d71e3e40d8446616f8ad7ba',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_un4yda65a',
  'maaike.desmedt',
  'd84f409c3c6b6546836e8dd1cec4054b2a81d58191189c5f8a0f51ef475e1242',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_7louxevf0',
  'amelie.dewinter',
  '044dad9ccaa7e8cacd1335cb0eb99b489d414fdfc957c3140a77559cb91a1571',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_o24l790so',
  'jutta.dewolf',
  '6691f6cc3740ea38a33f290e720250f4b4a6501c0c00111630880ed80f52205a',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_bpai5axay',
  'sirana.diet',
  'b1e9a52bd503525b5f8437556c84d2d3fcf3869c3551faa7fcda0109517e818c',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_rgs7cnuv3',
  'benoît.donche',
  'e841fd4e57c1af47877c91ddf84f480e115153cc39a19305c1d0599b6f7e7502',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_1oyjnwq1c',
  'sven.geldof',
  'b0540ad453f1fd8253064b149f2126c758a85cefeac7a65730bad7d726bff54a',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_o1d0oajvq',
  'pascale.huart',
  'ac243306a91d00e736c70011fb2172b8d065b2b44f53ee4674b8211fc80cfb41',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_xgnfbi8qj',
  'wout.leber',
  'cdcb7aa4a0ac7a01049d8095ee0f970d7321caefba793a09b16b359b0842d8e9',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_daebjpaog',
  'anastasia.madan',
  '102238c7cff1520f416883c9519a4b89a5e5e74411d0f6bdb451fb8f7a3a88b6',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_g6mw3nujq',
  'zoë.maes',
  '26a3781a492306c2e2db33e6de52e36018bd62f73492fc82610cafc3fe884543',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_wv6axj2uy',
  'aaron.matthys',
  'e8353b42d4bbb435a02bf6fd3764facd9051208cd5ab09023801314e6c79e6a5',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_6li8fltll',
  'brecht.merlevede',
  '2e9e7c09c1f5d96c323101cb51fe702e733d848c810d9eab8297035d537777e3',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_iraxsd9ka',
  'sabine.mettepenningen',
  'ba21e6fcddbf79b6d470f19d41818abf4f7e4ca999f7de883b28bb55a6296270',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_mvbqcxy2t',
  'eden.ramon',
  'b74332065bf612440bb15c49598b5e97640fc909179c9e09e8cbb354298180eb',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_78zct9xg8',
  'eva.ranson',
  '956613ba629c53354ce45bd0b5d85879ba94b2c507d9bb7db6d47fefdc748892',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_ttjez86ag',
  'kim.rosseel',
  '98cf47dfeeec5f905b6819641651b51ace76fa281256445c807ffaea4ecac6c4',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_g80545bjx',
  'jeroen.tant',
  '77fac3394a4efcb447a378c21913d3b74ce5be3ba76b53b44a797a70f6ce2d11',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_eaxynnbq1',
  'leontine.vandenbussche',
  '246124210b099b883f54674073c827be95b82b0e482f382ee256a8d8d8d539da',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_7hmqmq0sy',
  'daniek.vanhelsuwé',
  '0d5645bb4b74e3034742b0df0ccf721b702bda5501ba62d67eb9750d3b50f682',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_ifdaf8fl9',
  'jana.vannevel',
  'a571581ab6e994bc2a98f1784df382f1ed8e0dd1771a867c1d6f120ee8e5104e',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_02ksz5hlt',
  'thieme.vanruymbeke',
  '5fb4104e3e3598f9f10edac9c1e0036b2796bbc231aa4495a1b1d2659bdcc129',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_hd76j2bum',
  'jessie.verhaeghe',
  'bf43c2ffafebece27939935a5fa561bccdb6a48d4f3020e7997d375d84749040',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_lupxdoy9f',
  'lisa.verschuere',
  '91e317d8c30932fda4aa4785b0f2ec099c40d7dbc0ff736df633a76c5c2449ae',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_n4fwvx0t8',
  'stephanie.zanetic',
  '1ab54df06bbb0467132c15289df76322b643d5eda8e6cd53df7d555e8d282644',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  'user_1766850868347_iaqdf4zdm',
  'pieter-jan.vanhollebeke',
  '54b1677ab74a87524db655860a8ca6d220f996b92b28e82f29174982e4db3491',
  'reports_access',
  '{"dagelijks":false,"weekoverzicht":true,"statistieken":true,"rapporten":true,"students":false,"audit":false}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (username) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  active = EXCLUDED.active,
  updated_at = NOW();
