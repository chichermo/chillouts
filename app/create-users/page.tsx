'use client';

import { useState } from 'react';
import Navigation from '@/components/Navigation';
import { createUser } from '@/lib/users';
import { isAdmin } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

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

export default function CreateUsersPage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [credentials, setCredentials] = useState<Array<{ username: string; password: string; role: string }>>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdmin()) {
      router.push('/');
    }
  }, [router]);

  const handleCreateAll = async () => {
    setCreating(true);
    setError('');
    const newCredentials: Array<{ username: string; password: string; role: string }> = [];

    for (const userData of users) {
      const password = generatePassword(10);
      try {
        await createUser(userData.username, password, userData.role);
        newCredentials.push({
          username: userData.username,
          password: password,
          role: userData.role,
        });
      } catch (error: any) {
        console.error(`Error creando ${userData.username}:`, error);
        // Continuar con el siguiente usuario
      }
    }

    setCredentials(newCredentials);
    setCreating(false);
  };

  const downloadCredentials = () => {
    const content = credentials.map(c => 
      `Usuario: ${c.username}\nContraseña: ${c.password}\nRol: ${c.role}\n`
    ).join('\n---\n\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users-credentials.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadJSON = () => {
    const content = JSON.stringify(credentials, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users-credentials.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navigation />
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 text-white">Gebruikers Aanmaken</h1>
          <p className="text-sm text-white/90">
            Maak alle gebruikers aan met automatisch gegenereerde wachtwoorden
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 text-red-200 rounded-lg">
            {error}
          </div>
        )}

        <div className="glass-effect rounded-lg p-6 border border-white/20 mb-6">
          <p className="text-white mb-4">
            Dit zal {users.length} gebruikers aanmaken met automatisch gegenereerde wachtwoorden.
          </p>
          <button
            onClick={handleCreateAll}
            disabled={creating}
            className="px-6 py-3 bg-brand-green text-white rounded-lg hover:bg-emerald-600 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Gebruikers aanmaken...' : 'Alle Gebruikers Aanmaken'}
          </button>
        </div>

        {credentials.length > 0 && (
          <div className="glass-effect rounded-lg p-6 border border-white/20">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">
                Gebruikers Aangemaakt ({credentials.length})
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={downloadCredentials}
                  className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-blue-600 font-semibold transition-colors"
                >
                  Download TXT
                </button>
                <button
                  onClick={downloadJSON}
                  className="px-4 py-2 bg-brand-orange text-white rounded-lg hover:bg-orange-600 font-semibold transition-colors"
                >
                  Download JSON
                </button>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-blue-900/50 backdrop-blur">
                  <tr className="border-b border-white/20">
                    <th className="px-4 py-3 text-left font-semibold text-white">Gebruikersnaam</th>
                    <th className="px-4 py-3 text-left font-semibold text-white">Wachtwoord</th>
                    <th className="px-4 py-3 text-left font-semibold text-white">Rol</th>
                  </tr>
                </thead>
                <tbody>
                  {credentials.map((cred, index) => (
                    <tr key={index} className="border-b border-white/10 hover:bg-white/10 transition-colors">
                      <td className="px-4 py-2 font-medium text-white">{cred.username}</td>
                      <td className="px-4 py-2 text-white font-mono">{cred.password}</td>
                      <td className="px-4 py-2 text-white/70">{cred.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

