import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

interface UserData {
  username: string;
  role: 'admin' | 'full_access' | 'dagelijks_access' | 'reports_access';
}

// Generar contraseña aleatoria
function generatePassword(length: number = 10): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

// Hash de contraseña usando Node.js crypto (funciona en servidor)
async function hashPassword(password: string): Promise<string> {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Definir permisos por rol
const ROLE_PERMISSIONS: Record<string, any> = {
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

const users: UserData[] = [
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

export async function POST(request: Request) {
  if (!supabase) {
    return NextResponse.json(
      { success: false, error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY' },
      { status: 500 }
    );
  }

  try {
    const credentials: Array<{ username: string; password: string; role: string }> = [];
    const errors: Array<{ username: string; error: string }> = [];

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
              errors.push({
                username: userData.username,
                error: updateError.message || 'Unknown error',
              });
              continue;
            }
          } else {
            errors.push({
              username: userData.username,
              error: error.message || 'Unknown error',
            });
            continue;
          }
        }

        credentials.push({
          username: userData.username,
          password: password,
          role: userData.role,
        });
      } catch (error: any) {
        errors.push({
          username: userData.username,
          error: error.message || 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      created: credentials.length,
      total: users.length,
      credentials,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

