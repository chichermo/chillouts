// Script para crear todos los usuarios con contraseñas
// Ejecutar con: npx ts-node scripts/create-users.ts

import { createUser } from '../lib/users';

interface UserData {
  username: string;
  role: 'admin' | 'full_access' | 'dagelijks_access' | 'reports_access';
}

// Generar contraseña aleatoria
function generatePassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

const users: UserData[] = [
  // Full Access (admin)
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
  const credentials: Array<{ username: string; password: string; role: string }> = [];
  
  console.log('Creando usuarios...\n');
  
  for (const userData of users) {
    const password = generatePassword(10);
    try {
      await createUser(userData.username, password, userData.role);
      credentials.push({
        username: userData.username,
        password: password,
        role: userData.role,
      });
      console.log(`✓ Creado: ${userData.username} (${userData.role})`);
    } catch (error: any) {
      console.error(`✗ Error creando ${userData.username}:`, error.message);
    }
  }
  
  console.log('\n=== CREDENCIALES DE USUARIOS ===\n');
  console.log('Usuario\t\t\t\tContraseña\t\t\tRol');
  console.log('─'.repeat(80));
  
  credentials.forEach(cred => {
    console.log(`${cred.username.padEnd(30)}\t${cred.password.padEnd(20)}\t${cred.role}`);
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
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  createAllUsers().catch(console.error);
}

export { createAllUsers, users, generatePassword };

