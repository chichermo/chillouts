// Script para crear todos los usuarios directamente
// Ejecutar con: node scripts/create-users-direct.js
// Requiere variables de entorno: NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY deben estar configuradas');
  console.error('   Crea un archivo .env.local con estas variables o configúralas en el entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Generar contraseña aleatoria
function generatePassword(length = 10) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

// Hash de contraseña simple (SHA-256)
async function hashPassword(password) {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback simple (no seguro)
  return Buffer.from(password).toString('base64');
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

async function createAllUsers() {
  const credentials = [];
  const errors = [];
  
  console.log('🚀 Iniciando creación de usuarios...\n');
  console.log(`📊 Total de usuarios a crear: ${users.length}\n`);
  
  for (const userData of users) {
    const password = generatePassword(10);
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const passwordHash = await hashPassword(password);
    const permissions = ROLE_PERMISSIONS[userData.role] || ROLE_PERMISSIONS.reports_access;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: userId,
          username: userData.username,
          password_hash: passwordHash,
          role: userData.role,
          permissions: permissions,
          active: true,
        })
        .select()
        .single();
      
      if (error) {
        // Si el usuario ya existe, intentar actualizar
        if (error.code === '23505') {
          console.log(`⚠️  Usuario ${userData.username} ya existe, actualizando...`);
          const { error: updateError } = await supabase
            .from('users')
            .update({
              password_hash: passwordHash,
              role: userData.role,
              permissions: permissions,
              active: true,
            })
            .eq('username', userData.username);
          
          if (updateError) {
            errors.push({ username: userData.username, error: updateError.message });
            console.log(`✗ Error actualizando ${userData.username}: ${updateError.message}`);
            continue;
          }
        } else {
          errors.push({ username: userData.username, error: error.message });
          console.log(`✗ Error creando ${userData.username}: ${error.message}`);
          continue;
        }
      }
      
      credentials.push({
        username: userData.username,
        password: password,
        role: userData.role,
      });
      console.log(`✓ Creado: ${userData.username} (${userData.role})`);
    } catch (error) {
      errors.push({ username: userData.username, error: error.message });
      console.log(`✗ Error creando ${userData.username}: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📋 RESUMEN');
  console.log('='.repeat(80));
  console.log(`✓ Usuarios creados exitosamente: ${credentials.length}`);
  console.log(`✗ Errores: ${errors.length}`);
  console.log(`📊 Total procesado: ${users.length}\n`);
  
  if (errors.length > 0) {
    console.log('❌ ERRORES:');
    errors.forEach(err => {
      console.log(`   - ${err.username}: ${err.error}`);
    });
    console.log('');
  }
  
  console.log('='.repeat(80));
  console.log('🔐 CREDENCIALES DE USUARIOS');
  console.log('='.repeat(80));
  console.log('');
  
  credentials.forEach(cred => {
    console.log(`Usuario: ${cred.username}`);
    console.log(`Contraseña: ${cred.password}`);
    console.log(`Rol: ${cred.role}`);
    console.log('---');
  });
  
  // Guardar en archivo JSON
  const fs = require('fs');
  const path = require('path');
  const outputPath = path.join(process.cwd(), 'users-credentials.json');
  fs.writeFileSync(outputPath, JSON.stringify(credentials, null, 2));
  console.log(`\n✓ Credenciales guardadas en: ${outputPath}`);
  
  // Guardar también en formato texto legible
  const textOutput = credentials.map(c => 
    `Usuario: ${c.username}\nContraseña: ${c.password}\nRol: ${c.role}\n`
  ).join('\n---\n\n');
  
  const textPath = path.join(process.cwd(), 'users-credentials.txt');
  fs.writeFileSync(textPath, textOutput);
  console.log(`✓ Credenciales en texto guardadas en: ${textPath}`);
  
  return { credentials, errors };
}

// Ejecutar
createAllUsers()
  .then(() => {
    console.log('\n✅ Proceso completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });

