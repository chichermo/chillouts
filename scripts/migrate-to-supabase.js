// Script para migrar datos de localStorage a Supabase
// Ejecutar en la consola del navegador de tu aplicación LOCAL (localhost:3000)
// Después de ejecutar, los datos estarán en Supabase y aparecerán en producción

// CONFIGURA ESTOS VALORES CON TUS CREDENCIALES DE SUPABASE
const SUPABASE_URL = 'https://etwyxdbkagbihadvfesq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0d3l4ZGJrYWdiaWhhZHZmZXNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzU3MTAsImV4cCI6MjA4MDYxMTcxMH0.j3v4vGGxAkTsoY9gWFTONm0Rcnh7ojBT9s3papi0-iM';

async function migrateToSupabase() {
  console.log('🚀 Iniciando migración de datos a Supabase...');
  
  // 1. Cargar datos de localStorage
  const stored = localStorage.getItem('chillapp_data');
  if (!stored) {
    console.error('❌ No se encontraron datos en localStorage');
    return;
  }
  
  const data = JSON.parse(stored);
  console.log('📦 Datos encontrados:', {
    estudiantes: data.students?.length || 0,
    registros: Object.keys(data.dailyRecords || {}).length
  });
  
  // 2. Migrar estudiantes
  if (data.students && data.students.length > 0) {
    console.log(`\n📝 Migrando ${data.students.length} estudiantes...`);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(data.students)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ ${result.length} estudiantes migrados exitosamente`);
      } else {
        const error = await response.text();
        console.error('❌ Error migrando estudiantes:', error);
        
        // Intentar uno por uno si falla el batch
        console.log('🔄 Intentando migrar uno por uno...');
        let successCount = 0;
        for (const student of data.students) {
          try {
            const singleResponse = await fetch(`${SUPABASE_URL}/rest/v1/students`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify(student)
            });
            
            if (singleResponse.ok) {
              successCount++;
            } else {
              console.error(`❌ Error con estudiante ${student.name}:`, await singleResponse.text());
            }
          } catch (err) {
            console.error(`❌ Error con estudiante ${student.name}:`, err);
          }
        }
        console.log(`✅ ${successCount}/${data.students.length} estudiantes migrados`);
      }
    } catch (error) {
      console.error('❌ Error en la migración de estudiantes:', error);
    }
  }
  
  // 3. Migrar registros diarios
  if (data.dailyRecords && Object.keys(data.dailyRecords).length > 0) {
    const records = Object.values(data.dailyRecords);
    console.log(`\n📅 Migrando ${records.length} registros diarios...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const record of records) {
      try {
        const recordData = {
          date: record.date,
          day_name: record.dayName,
          entries: record.entries
        };
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/daily_records`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(recordData)
        });
        
        if (response.ok) {
          successCount++;
        } else {
          const errorText = await response.text();
          // Si el registro ya existe, intentar actualizar
          if (response.status === 409 || errorText.includes('duplicate')) {
            console.log(`⚠️ Registro ${record.date} ya existe, actualizando...`);
            const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/daily_records?date=eq.${record.date}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify(recordData)
            });
            
            if (updateResponse.ok) {
              successCount++;
            } else {
              errorCount++;
              console.error(`❌ Error actualizando ${record.date}:`, await updateResponse.text());
            }
          } else {
            errorCount++;
            console.error(`❌ Error con registro ${record.date}:`, errorText);
          }
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Error con registro ${record.date}:`, error);
      }
    }
    
    console.log(`✅ ${successCount} registros migrados, ${errorCount} errores`);
  }
  
  console.log('\n🎉 Migración completada!');
  console.log('💡 Recarga tu aplicación en Vercel para ver los datos.');
}

// Ejecutar migración
migrateToSupabase();

