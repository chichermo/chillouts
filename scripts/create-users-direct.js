// Script para crear usuarios directamente usando la función createUser
// Funciona tanto con Supabase como con localStorage (cliente)

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Si Supabase está configurado, usarlo
const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

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
    rapporten_docenten: true,
    backup: true,
    portal_chillouts: true,
    portal_detentions: true,
    portal_o2: true,
    students: true,
    audit: true,
  },
  full_access: {
    dagelijks: true,
    weekoverzicht: true,
    statistieken: true,
    rapporten: true,
    rapporten_docenten: false,
    backup: false,
    portal_chillouts: true,
    portal_detentions: true,
    portal_o2: false,
    students: true,
    audit: false,
  },
  dagelijks_access: {
    dagelijks: true,
    weekoverzicht: true,
    statistieken: true,
    rapporten: true,
    rapporten_docenten: false,
    backup: false,
    portal_chillouts: true,
    portal_detentions: true,
    portal_o2: false,
    students: false,
    audit: false,
  },
  reports_access: {
    dagelijks: false,
    weekoverzicht: true,
    statistieken: true,
    rapporten: true,
    rapporten_docenten: false,
    backup: false,
    portal_chillouts: true,
    portal_detentions: true,
    portal_o2: false,
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

async function createUsers() {
  if (!supabase) {
    console.log('⚠️  Supabase no está configurado.');
    console.log('   Crea un archivo .env.local con:');
    console.log('   NEXT_PUBLIC_SUPABASE_URL=tu_url');
    console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key');
    console.log('');
    console.log('   O usa la interfaz web en /create-users-execute después de configurar Supabase.');
    return;
  }

  const credentials = [];
  const errors = [];

  console.log(`Creando ${users.length} usuarios...\n`);

  for (const userData of users) {
    const password = generatePassword(10);
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const passwordHash = hashPassword(password);
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
            console.log(`❌ ${userData.username}: ${updateError.message}`);
            continue;
          } else {
            console.log(`✓ ${userData.username} (actualizado)`);
          }
        } else {
          errors.push({ username: userData.username, error: error.message });
          console.log(`❌ ${userData.username}: ${error.message}`);
          continue;
        }
      } else {
        console.log(`✓ ${userData.username}`);
      }

      credentials.push({
        username: userData.username,
        password: password,
        role: userData.role,
      });
    } catch (error) {
      errors.push({ username: userData.username, error: error.message });
      console.log(`❌ ${userData.username}: ${error.message}`);
    }
  }

  console.log(`\n✅ Completado: ${credentials.length} de ${users.length} usuarios creados/actualizados`);

  if (errors.length > 0) {
    console.log(`\n⚠️  Errores: ${errors.length}`);
    errors.forEach(err => {
      console.log(`   - ${err.username}: ${err.error}`);
    });
  }

  // Guardar credenciales en archivos
  if (credentials.length > 0) {
    const jsonPath = path.join(__dirname, '..', 'users-credentials.json');
    const txtPath = path.join(__dirname, '..', 'users-credentials.txt');

    // JSON
    fs.writeFileSync(jsonPath, JSON.stringify(credentials, null, 2), 'utf8');
    console.log(`\n📄 Credenciales guardadas en: ${jsonPath}`);

    // TXT
    const txtContent = credentials.map(c => 
      `Gebruikersnaam: ${c.username}\nWachtwoord: ${c.password}\nRol: ${c.role}\n`
    ).join('\n---\n\n');
    fs.writeFileSync(txtPath, txtContent, 'utf8');
    console.log(`📄 Credenciales guardadas en: ${txtPath}`);
  }
}

createUsers().catch(console.error);
