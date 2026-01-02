'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';

export default function MigratePage() {
  const [status, setStatus] = useState<string>('Preparando migración...');
  const [progress, setProgress] = useState<{ students: number; records: number; errors: string[] }>({
    students: 0,
    records: 0,
    errors: []
  });
  const [migrating, setMigrating] = useState(false);
  const [completed, setCompleted] = useState(false);

  const SUPABASE_URL = 'https://etwyxdbkagbihadvfesq.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0d3l4ZGJrYWdiaWhhZHZmZXNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzU3MTAsImV4cCI6MjA4MDYxMTcxMH0.j3v4vGGxAkTsoY9gWFTONm0Rcnh7ojBT9s3papi0-iM';

  useEffect(() => {
    // Auto-ejecutar migración al cargar la página
    if (!migrating && !completed) {
      handleMigrate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMigrate = async () => {
    setMigrating(true);
    setStatus('Iniciando migración...');
    const errors: string[] = [];

    try {
      // Cargar datos de localStorage
      const stored = localStorage.getItem('chillapp_data');
      if (!stored) {
        setStatus('❌ No se encontraron datos en localStorage');
        setMigrating(false);
        return;
      }

      const data = JSON.parse(stored);
      setStatus(`📦 Datos encontrados: ${data.students?.length || 0} estudiantes, ${Object.keys(data.dailyRecords || {}).length} registros`);

      // Migrar estudiantes
      if (data.students && data.students.length > 0) {
        setStatus(`📝 Migrando ${data.students.length} estudiantes...`);
        let successCount = 0;

        // Usar PATCH directamente para hacer UPSERT (insertar o actualizar)
        for (const student of data.students) {
          try {
            // Usar PATCH con el id en la query para hacer UPSERT
            const response = await fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${student.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify(student)
            });

            if (response.ok) {
              // Si el PATCH no encontró el registro, intentar POST
              if (response.status === 204 || response.status === 200) {
                successCount++;
                setProgress(prev => ({ ...prev, students: successCount }));
              } else {
                // Intentar POST si el PATCH no funcionó
                const postResponse = await fetch(`${SUPABASE_URL}/rest/v1/students`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Prefer': 'return=minimal'
                  },
                  body: JSON.stringify(student)
                });
                if (postResponse.ok || postResponse.status === 201) {
                  successCount++;
                  setProgress(prev => ({ ...prev, students: successCount }));
                } else {
                  errors.push(`Fout met ${student.name}: bestaat al of onbekende fout`);
                }
              }
            } else {
              // Si PATCH falla, intentar POST
              const postResponse = await fetch(`${SUPABASE_URL}/rest/v1/students`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': SUPABASE_KEY,
                  'Authorization': `Bearer ${SUPABASE_KEY}`,
                  'Prefer': 'return=minimal'
                },
                body: JSON.stringify(student)
              });
              if (postResponse.ok || postResponse.status === 201) {
                successCount++;
                setProgress(prev => ({ ...prev, students: successCount }));
              } else if (postResponse.status === 409) {
                // Ya existe, considerar como éxito
                successCount++;
                setProgress(prev => ({ ...prev, students: successCount }));
              } else {
                const errorText = await postResponse.text();
                errors.push(`Fout met ${student.name}: ${errorText.substring(0, 50)}`);
              }
            }
          } catch (error: any) {
            errors.push(`Fout met ${student.name}: ${error.message}`);
          }
        }

        setStatus(`✅ ${successCount} estudiantes migrados`);
      }

      // Migrar registros diarios
      if (data.dailyRecords) {
        const records = Object.values(data.dailyRecords);
        setStatus(`📅 Migrando ${records.length} registros diarios...`);
        let successCount = 0;

        for (const record of records as any[]) {
          try {
            const recordData = {
              date: record.date,
              day_name: record.dayName,
              entries: record.entries
            };

            // Usar PATCH primero para hacer UPSERT
            const response = await fetch(`${SUPABASE_URL}/rest/v1/daily_records?date=eq.${record.date}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify(recordData)
            });

            if (response.ok || response.status === 204) {
              successCount++;
              setProgress(prev => ({ ...prev, records: successCount }));
            } else {
              // Si PATCH no funcionó, intentar POST
              const postResponse = await fetch(`${SUPABASE_URL}/rest/v1/daily_records`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': SUPABASE_KEY,
                  'Authorization': `Bearer ${SUPABASE_KEY}`,
                  'Prefer': 'return=minimal'
                },
                body: JSON.stringify(recordData)
              });
              if (postResponse.ok || postResponse.status === 201) {
                successCount++;
                setProgress(prev => ({ ...prev, records: successCount }));
              } else if (postResponse.status === 409) {
                // Ya existe, considerar como éxito
                successCount++;
                setProgress(prev => ({ ...prev, records: successCount }));
              } else {
                const errorText = await postResponse.text();
                errors.push(`Fout met record ${record.date}: ${errorText.substring(0, 50)}`);
              }
            }
          } catch (error: any) {
            errors.push(`Fout met record ${record.date}: ${error.message}`);
          }
        }

        setStatus(`✅ ${successCount} registros migrados`);
      }

      setProgress(prev => ({ ...prev, errors }));
      setStatus('🎉 Migración completada!');
      setCompleted(true);

    } catch (error: any) {
      setStatus(`❌ Fout: ${error.message}`);
      setMigrating(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
      </div>
      <Navigation />
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="glass-effect rounded-lg p-8 border border-white/30 max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-6">Migración de Datos a Supabase</h1>
          
          <div className="space-y-4">
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-white font-medium mb-2">Estado:</p>
              <p className="text-white/80">{status}</p>
            </div>

            {migrating && (
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-white font-medium mb-2">Progreso:</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-white/80">Estudiantes:</span>
                    <span className="text-white font-semibold">{progress.students}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/80">Registros:</span>
                    <span className="text-white font-semibold">{progress.records}</span>
                  </div>
                </div>
              </div>
            )}

            {progress.errors.length > 0 && (
              <div className="bg-red-500/20 rounded-lg p-4">
                <p className="text-red-200 font-medium mb-2">Errores ({progress.errors.length}):</p>
                <ul className="text-red-200/80 text-sm space-y-1 max-h-40 overflow-y-auto">
                  {progress.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {completed && (
              <div className="bg-emerald-500/20 rounded-lg p-4">
                <p className="text-emerald-200 font-medium mb-2">✅ Migración completada</p>
                <p className="text-emerald-200/80 text-sm">
                  Los datos han sido migrados a Supabase. Recarga tu aplicación en Vercel para ver los cambios.
                </p>
                <a
                  href="/"
                  className="mt-4 inline-block px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                >
                  Terug naar start
                </a>
              </div>
            )}

            {!migrating && !completed && (
              <button
                onClick={handleMigrate}
                className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold transition-colors"
              >
                Migratie starten
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

