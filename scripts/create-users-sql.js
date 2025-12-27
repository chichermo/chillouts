// Script para generar SQL y credenciales de usuarios
// Ejecuta el SQL en Supabase y guarda las credenciales generadas

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Hash de contraseña
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Generar contraseña aleatoria
function generatePassword(length = 10) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

// Definir permisos por rol
const ROLE_PERMISSIONS = {
  admin: {
    dagelijks: true,
    weekoverzicht: true,
    statistieken: true,
    rapporten: true,
    students: true,
    audit: true,
  },
  full_access: {
    dagelijks: true,
    weekoverzicht: true,
    statistieken: true,
    rapporten: true,
    students: true,
    audit: false,
  },
  dagelijks_access: {
    dagelijks: true,
    weekoverzicht: true,
    statistieken: true,
    rapporten: true,
    students: false,
    audit: false,
  },
  reports_access: {
    dagelijks: false,
    weekoverzicht: true,
    statistieken: true,
    rapporten: true,
    students: false,
    audit: false,
  },
};

const users = [
  // Full Access
  { username: 'julie.gérard', role: 'full_access' },
  { username: 'liesbeth.kreps', role: 'full_access' },
  { username: 'annelore.delbecque', role: 'full_access' },
  
  // Access to dagelijks / weekoverzicht / statistieken / rapporten
  { username: 'lisa.floré', role: 'dagelijks_access' },
  { username: 'yves.vanhoeserlande', role: 'dagelijks_access' },
  { username: 'dennie.viaene', role: 'dagelijks_access' },
  { username: 'jasmien.dantschotter', role: 'dagelijks_access' },
  { username: 'peter.laloo', role: 'dagelijks_access' },
  { username: 'warre.ballegeer', role: 'dagelijks_access' },
  { username: 'dimitri.bottelberghe', role: 'dagelijks_access' },
  
  // Access to weekoverzicht/statistieken/rapporten
  { username: 'gert.arickx', role: 'reports_access' },
  { username: 'manon.baert', role: 'reports_access' },
  { username: 'axel.barbier', role: 'reports_access' },
  { username: 'nicolas.boi', role: 'reports_access' },
  { username: 'loes.coudeville', role: 'reports_access' },
  { username: 'annie.debrabander', role: 'reports_access' },
  { username: 'nelia.decloedt', role: 'reports_access' },
  { username: 'jordin.decorte', role: 'reports_access' },
  { username: 'lorenzo.degrande', role: 'reports_access' },
  { username: 'saskia.delarue', role: 'reports_access' },
  { username: 'koen.deleu', role: 'reports_access' },
  { username: 'deborah.denys', role: 'reports_access' },
  { username: 'emma.depachter', role: 'reports_access' },
  { username: 'elke.derycke', role: 'reports_access' },
  { username: 'maaike.desmedt', role: 'reports_access' },
  { username: 'amelie.dewinter', role: 'reports_access' },
  { username: 'jutta.dewolf', role: 'reports_access' },
  { username: 'sirana.diet', role: 'reports_access' },
  { username: 'benoît.donche', role: 'reports_access' },
  { username: 'sven.geldof', role: 'reports_access' },
  { username: 'pascale.huart', role: 'reports_access' },
  { username: 'wout.leber', role: 'reports_access' },
  { username: 'anastasia.madan', role: 'reports_access' },
  { username: 'zoë.maes', role: 'reports_access' },
  { username: 'aaron.matthys', role: 'reports_access' },
  { username: 'brecht.merlevede', role: 'reports_access' },
  { username: 'sabine.mettepenningen', role: 'reports_access' },
  { username: 'eden.ramon', role: 'reports_access' },
  { username: 'eva.ranson', role: 'reports_access' },
  { username: 'kim.rosseel', role: 'reports_access' },
  { username: 'jeroen.tant', role: 'reports_access' },
  { username: 'leontine.vandenbussche', role: 'reports_access' },
  { username: 'daniek.vanhelsuwé', role: 'reports_access' },
  { username: 'jana.vannevel', role: 'reports_access' },
  { username: 'thieme.vanruymbeke', role: 'reports_access' },
  { username: 'jessie.verhaeghe', role: 'reports_access' },
  { username: 'lisa.verschuere', role: 'reports_access' },
  { username: 'stephanie.zanetic', role: 'reports_access' },
  { username: 'pieter-jan.vanhollebeke', role: 'reports_access' },
];

// Generar credenciales y SQL
const credentials = [];
const sqlStatements = [];

users.forEach((userData) => {
  const password = generatePassword(10);
  const passwordHash = hashPassword(password);
  const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const permissions = JSON.stringify(ROLE_PERMISSIONS[userData.role] || ROLE_PERMISSIONS.reports_access);

  credentials.push({
    username: userData.username,
    password: password,
    role: userData.role,
  });

  // Crear statement SQL con ON CONFLICT para evitar duplicados
  const sql = `INSERT INTO users (id, username, password_hash, role, permissions, active, created_at, updated_at)
VALUES (
  '${userId}',
  '${userData.username.replace(/'/g, "''")}',
  '${passwordHash}',
  '${userData.role}',
  '${permissions.replace(/'/g, "''")}'::jsonb,
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
  updated_at = NOW();`;

  sqlStatements.push(sql);
});

// Guardar SQL
const sqlPath = path.join(__dirname, '..', 'supabase', 'create_users.sql');
const sqlDir = path.dirname(sqlPath);
if (!fs.existsSync(sqlDir)) {
  fs.mkdirSync(sqlDir, { recursive: true });
}

const sqlContent = `-- Script SQL para crear todos los usuarios
-- Ejecuta este script en Supabase SQL Editor

${sqlStatements.join('\n\n')}
`;

fs.writeFileSync(sqlPath, sqlContent, 'utf8');
console.log(`✅ SQL generado en: ${sqlPath}`);

// Guardar credenciales JSON
const jsonPath = path.join(__dirname, '..', 'users-credentials.json');
fs.writeFileSync(jsonPath, JSON.stringify(credentials, null, 2), 'utf8');
console.log(`✅ Credenciales JSON guardadas en: ${jsonPath}`);

// Guardar credenciales TXT
const txtPath = path.join(__dirname, '..', 'users-credentials.txt');
const txtContent = credentials.map(c => 
  `Gebruikersnaam: ${c.username}\nWachtwoord: ${c.password}\nRol: ${c.role}\n`
).join('\n---\n\n');
fs.writeFileSync(txtPath, txtContent, 'utf8');
console.log(`✅ Credenciales TXT guardadas en: ${txtPath}`);

console.log(`\n📊 Total: ${credentials.length} usuarios`);
console.log('\n📝 Próximos pasos:');
console.log('1. Ve a Supabase Dashboard > SQL Editor');
console.log('2. Copia y pega el contenido de supabase/create_users.sql');
console.log('3. Ejecuta el script');
console.log('4. Las credenciales están guardadas en users-credentials.json y users-credentials.txt');

