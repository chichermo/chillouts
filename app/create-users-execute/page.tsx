'use client';

import { useState } from 'react';
import Navigation from '@/components/Navigation';
import { isAdmin } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CreateUsersExecutePage() {
  const router = useRouter();
  const [executing, setExecuting] = useState(false);
  const [credentials, setCredentials] = useState<Array<{ username: string; password: string; role: string }>>([]);
  const [errors, setErrors] = useState<Array<{ username: string; error: string }>>([]);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (!isAdmin()) {
      router.push('/');
    }
  }, [router]);

  const handleExecute = async () => {
    if (!confirm('¿Estás seguro de que quieres crear TODOS los usuarios? Esto solo debe hacerse una vez.')) {
      return;
    }

    setExecuting(true);
    setCredentials([]);
    setErrors([]);
    setResult(null);

    try {
      const response = await fetch('/api/create-all-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
        setCredentials(data.credentials || []);
        setErrors(data.errors || []);
      } else {
        setErrors([{ username: 'General', error: data.error || 'Error desconocido' }]);
      }
    } catch (error: any) {
      setErrors([{ username: 'General', error: error.message || 'Error de conexión' }]);
    } finally {
      setExecuting(false);
    }
  };

  const downloadCredentials = () => {
    if (credentials.length === 0) return;

    const content = credentials.map(c => 
      `Usuario: ${c.username}\nContraseña: ${c.password}\nRol: ${c.role}\n`
    ).join('\n---\n\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-credentials-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadJSON = () => {
    if (credentials.length === 0) return;

    const content = JSON.stringify(credentials, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-credentials-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navigation />
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 text-white">Crear Todos los Usuarios</h1>
          <p className="text-sm text-white/90">
            ⚠️ Esta acción creará todos los usuarios en la base de datos. Solo debe ejecutarse UNA VEZ.
          </p>
        </div>

        {result && (
          <div className={`mb-4 p-4 rounded-lg border ${
            result.success 
              ? 'bg-green-500/20 border-green-500/50 text-green-200' 
              : 'bg-red-500/20 border-red-500/50 text-red-200'
          }`}>
            <p className="font-semibold">
              {result.success 
                ? `✓ Se crearon ${result.created} de ${result.total} usuarios exitosamente`
                : '✗ Error al crear usuarios'}
            </p>
            {result.errors && result.errors.length > 0 && (
              <p className="mt-2 text-sm">
                Errores: {result.errors.length} usuario(s) no se pudieron crear
              </p>
            )}
          </div>
        )}

        {errors.length > 0 && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 text-red-200 rounded-lg">
            <h3 className="font-semibold mb-2">Errores:</h3>
            <ul className="list-disc list-inside text-sm">
              {errors.map((err, idx) => (
                <li key={idx}>{err.username}: {err.error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="glass-effect rounded-lg p-6 border border-white/20 mb-6">
          <p className="text-white mb-4">
            Este proceso creará 53 usuarios con contraseñas generadas automáticamente.
          </p>
          <button
            onClick={handleExecute}
            disabled={executing || credentials.length > 0}
            className="px-6 py-3 bg-brand-green text-white rounded-lg hover:bg-emerald-600 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {executing ? 'Creando usuarios...' : credentials.length > 0 ? 'Usuarios ya creados' : 'Crear Todos los Usuarios'}
          </button>
        </div>

        {credentials.length > 0 && (
          <div className="glass-effect rounded-lg p-6 border border-white/20">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">
                Usuarios Creados ({credentials.length})
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={downloadCredentials}
                  className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-blue-600 font-semibold transition-colors"
                >
                  Descargar TXT
                </button>
                <button
                  onClick={downloadJSON}
                  className="px-4 py-2 bg-brand-orange text-white rounded-lg hover:bg-orange-600 font-semibold transition-colors"
                >
                  Descargar JSON
                </button>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-blue-900/50 backdrop-blur">
                  <tr className="border-b border-white/20">
                    <th className="px-4 py-3 text-left font-semibold text-white">Usuario</th>
                    <th className="px-4 py-3 text-left font-semibold text-white">Contraseña</th>
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

