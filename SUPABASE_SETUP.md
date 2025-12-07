# Guía de Configuración de Supabase

## Paso 1: Crear Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Haz clic en **"New Project"**
4. Completa el formulario:
   - **Organization**: Crea una nueva o usa la existente
   - **Name**: `chillouts` (o el nombre que prefieras)
   - **Database Password**: ⚠️ **GUARDA ESTA CONTRASEÑA EN UN LUGAR SEGURO**
   - **Region**: Elige la más cercana a tus usuarios (ej: West Europe)
   - **Pricing Plan**: Free (suficiente para empezar)
5. Haz clic en **"Create new project"**
6. Espera 1-2 minutos a que se cree el proyecto

## Paso 2: Ejecutar el Schema SQL

1. En el dashboard de Supabase, ve a **"SQL Editor"** (en el menú izquierdo)
2. Haz clic en **"New query"**
3. Abre el archivo `supabase/schema.sql` de tu proyecto local
4. **Copia TODO el contenido** del archivo
5. Pégalo en el editor SQL de Supabase
6. Haz clic en **"Run"** (o presiona `Ctrl+Enter`)
7. Deberías ver: **"Success. No rows returned"**

### Verificar que las tablas se crearon:

1. Ve a **"Table Editor"** en el menú izquierdo
2. Deberías ver dos tablas:
   - `students`
   - `daily_records`

## Paso 3: Obtener las Credenciales

1. En el dashboard de Supabase, ve a **"Settings"** (⚙️) en el menú izquierdo
2. Haz clic en **"API"**
3. Encontrarás dos valores importantes:

   **a) Project URL:**
   - Se ve así: `https://xxxxx.supabase.co`
   - Copia este valor completo

   **b) anon public key:**
   - Es una clave larga que empieza con `eyJ...`
   - Copia esta clave completa

## Paso 4: Configurar Variables de Entorno en Vercel

1. Ve a [https://vercel.com](https://vercel.com)
2. Abre tu proyecto `chillouts`
3. Ve a **"Settings"** (en la parte superior)
4. Haz clic en **"Environment Variables"** (en el menú lateral)
5. Agrega las siguientes variables:

   **Variable 1:**
   - **Name**: `NEXT_PUBLIC_SUPABASE_URL`
   - **Value**: Pega tu Project URL de Supabase
   - **Environments**: Marca todas (Production, Preview, Development)
   - Haz clic en **"Save"**

   **Variable 2:**
   - **Name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Value**: Pega tu anon public key de Supabase
   - **Environments**: Marca todas (Production, Preview, Development)
   - Haz clic en **"Save"**

## Paso 5: Redesplegar la Aplicación

1. En Vercel, ve a la pestaña **"Deployments"**
2. Encuentra tu último deployment
3. Haz clic en los **tres puntos (⋯)** a la derecha
4. Selecciona **"Redeploy"**
5. Confirma el redeploy
6. Espera a que termine el deployment (1-2 minutos)

## Paso 6: Verificar que Funciona

1. Abre tu aplicación desplegada en Vercel
2. Abre la **consola del navegador** (F12)
3. Verifica que:
   - ✅ No hay errores relacionados con Supabase
   - ✅ Los datos se guardan correctamente
4. Prueba estas funcionalidades:
   - ✅ Agregar un estudiante nuevo
   - ✅ Crear un registro diario
   - ✅ Recargar la página y verificar que los datos persisten

## Troubleshooting

### Error: "Failed to fetch" o problemas de conexión
- Verifica que las variables de entorno estén correctamente configuradas en Vercel
- Asegúrate de que el Project URL y la anon key sean correctos
- Verifica que el proyecto de Supabase esté activo (no pausado)

### Los datos no se guardan
- Verifica en la consola del navegador si hay errores
- Revisa que las políticas RLS (Row Level Security) estén configuradas correctamente
- El schema SQL incluye políticas que permiten todas las operaciones, pero verifica en Supabase > Authentication > Policies

### Error al ejecutar el SQL
- Asegúrate de copiar TODO el contenido del archivo `schema.sql`
- Verifica que no haya errores de sintaxis
- Si hay un error específico, cópialo y busca ayuda

## Verificar Políticas RLS

1. En Supabase, ve a **"Table Editor"**
2. Selecciona la tabla `students`
3. Haz clic en **"Policies"** (o ve a Authentication > Policies)
4. Deberías ver una política llamada "Allow all operations on students"
5. Repite para la tabla `daily_records`

Si no ves las políticas, puedes crearlas manualmente ejecutando este SQL:

```sql
-- Para students
CREATE POLICY "Allow all operations on students" ON students
    FOR ALL USING (true) WITH CHECK (true);

-- Para daily_records
CREATE POLICY "Allow all operations on daily_records" ON daily_records
    FOR ALL USING (true) WITH CHECK (true);
```

## Límites del Plan Gratuito de Supabase

- **500 MB** de base de datos
- **2 GB** de bandwidth por mes
- **50,000 usuarios activos mensuales**
- **2 GB** de almacenamiento de archivos

Para la mayoría de aplicaciones escolares, esto es más que suficiente.

## Migrar Datos Existentes (Opcional)

Si tienes datos en localStorage que quieres migrar a Supabase:

1. Abre tu aplicación local (http://localhost:3000)
2. Abre la consola del navegador (F12)
3. Ejecuta este código (reemplaza con tus credenciales):

```javascript
// Configura tus credenciales
const SUPABASE_URL = 'TU_PROJECT_URL';
const SUPABASE_KEY = 'TU_ANON_KEY';

// Cargar datos de localStorage
const data = JSON.parse(localStorage.getItem('chillapp_data'));

// Subir estudiantes
if (data.students && data.students.length > 0) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/students`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(data.students)
  });
  console.log('Estudiantes subidos:', response.status);
}

// Subir registros diarios
if (data.dailyRecords) {
  const records = Object.values(data.dailyRecords).map(record => ({
    date: record.date,
    day_name: record.dayName,
    entries: record.entries
  }));
  
  for (const record of records) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/daily_records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(record)
    });
    console.log(`Registro ${record.date} subido:`, response.status);
  }
}
```

¡Listo! Tu aplicación ahora está conectada a Supabase y los datos se guardarán en la base de datos.

