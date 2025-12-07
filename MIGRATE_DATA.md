# Guía de Migración de Datos a Supabase

Si tienes datos en localStorage localmente y quieres que aparezcan en producción (Vercel), necesitas migrarlos a Supabase.

## Opción 1: Migración Automática (Recomendada)

1. **Abre tu aplicación LOCAL** en el navegador: `http://localhost:3000`

2. **Abre la consola del navegador** (F12 → Console)

3. **Copia y pega este código completo** en la consola:

```javascript
// Script de migración automática
const SUPABASE_URL = 'https://etwyxdbkagbihadvfesq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0d3l4ZGJrYWdiaWhhZHZmZXNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzU3MTAsImV4cCI6MjA4MDYxMTcxMH0.j3v4vGGxAkTsoY9gWFTONm0Rcnh7ojBT9s3papi0-iM';

async function migrateToSupabase() {
  console.log('🚀 Iniciando migración...');
  
  const stored = localStorage.getItem('chillapp_data');
  if (!stored) {
    console.error('❌ No hay datos en localStorage');
    return;
  }
  
  const data = JSON.parse(stored);
  console.log('📦 Datos encontrados:', {
    estudiantes: data.students?.length || 0,
    registros: Object.keys(data.dailyRecords || {}).length
  });
  
  // Migrar estudiantes
  if (data.students && data.students.length > 0) {
    console.log(`📝 Migrando ${data.students.length} estudiantes...`);
    
    for (const student of data.students) {
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/students`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(student)
        });
        
        if (response.ok) {
          console.log(`✅ ${student.name} migrado`);
        } else {
          const error = await response.text();
          if (error.includes('duplicate') || response.status === 409) {
            console.log(`⚠️ ${student.name} ya existe, actualizando...`);
            await fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${student.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify(student)
            });
          } else {
            console.error(`❌ Error con ${student.name}:`, error);
          }
        }
      } catch (error) {
        console.error(`❌ Error con ${student.name}:`, error);
      }
    }
  }
  
  // Migrar registros diarios
  if (data.dailyRecords) {
    const records = Object.values(data.dailyRecords);
    console.log(`📅 Migrando ${records.length} registros...`);
    
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
          console.log(`✅ Registro ${record.date} migrado`);
        } else if (response.status === 409) {
          console.log(`⚠️ Registro ${record.date} ya existe, actualizando...`);
          await fetch(`${SUPABASE_URL}/rest/v1/daily_records?date=eq.${record.date}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify(recordData)
          });
        } else {
          console.error(`❌ Error con registro ${record.date}:`, await response.text());
        }
      } catch (error) {
        console.error(`❌ Error con registro ${record.date}:`, error);
      }
    }
  }
  
  console.log('🎉 Migración completada! Recarga tu app en Vercel.');
}

migrateToSupabase();
```

4. **Presiona Enter** y espera a que termine la migración

5. **Verifica en Supabase**:
   - Ve a tu proyecto en Supabase
   - Table Editor → `students`
   - Deberías ver todos tus estudiantes

6. **Recarga tu aplicación en Vercel** y los datos deberían aparecer

## Opción 2: Migración Manual desde Supabase Dashboard

1. Ve a Supabase → Table Editor → `students`
2. Haz clic en "Insert row"
3. Llena manualmente cada estudiante (no recomendado si tienes muchos)

## Verificar que Funcionó

1. Ve a Supabase → Table Editor
2. Deberías ver tus estudiantes en la tabla `students`
3. Recarga tu aplicación en Vercel
4. Los estudiantes deberían aparecer automáticamente

## Troubleshooting

### Error: "relation does not exist"
- Ejecuta el SQL schema primero (ve a SQL Editor y ejecuta `supabase/schema.sql`)

### Error: "duplicate key value"
- El estudiante ya existe, el script lo actualizará automáticamente

### Los datos no aparecen en Vercel
- Verifica que las variables de entorno estén correctas
- Verifica que el SQL schema se haya ejecutado
- Recarga la página con Ctrl+Shift+R

