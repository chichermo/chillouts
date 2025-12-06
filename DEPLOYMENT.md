# Guía de Deployment - Chill-outs App

Esta guía te ayudará a desplegar la aplicación en Vercel con Supabase como base de datos.

## Paso 1: Crear cuenta en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta gratuita
3. Crea un nuevo proyecto:
   - Nombre: `chillouts` (o el que prefieras)
   - Contraseña de base de datos: guárdala en un lugar seguro
   - Región: elige la más cercana a tus usuarios

## Paso 2: Configurar la base de datos

1. En el dashboard de Supabase, ve a **SQL Editor**
2. Copia el contenido del archivo `supabase/schema.sql`
3. Pégalo en el editor SQL y ejecuta el script
4. Esto creará las tablas necesarias

## Paso 3: Obtener las credenciales de Supabase

1. En el dashboard de Supabase, ve a **Settings** > **API**
2. Copia los siguientes valores:
   - **Project URL** (será `NEXT_PUBLIC_SUPABASE_URL`)
   - **anon public** key (será `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

## Paso 4: Crear cuenta en Vercel

1. Ve a [https://vercel.com](https://vercel.com)
2. Crea una cuenta (puedes usar GitHub para facilitar)
3. Conecta tu repositorio de GitHub

## Paso 5: Desplegar en Vercel

1. En Vercel, haz clic en **Add New Project**
2. Selecciona el repositorio `chillouts`
3. Configura las variables de entorno:
   - Ve a **Environment Variables**
   - Agrega:
     - `NEXT_PUBLIC_SUPABASE_URL` = tu Project URL de Supabase
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = tu anon public key de Supabase
4. Haz clic en **Deploy**

## Paso 6: Migrar datos existentes (opcional)

Si tienes datos en localStorage que quieres migrar:

1. Abre la aplicación en desarrollo local
2. Abre la consola del navegador (F12)
3. Ejecuta:
```javascript
// Cargar datos de localStorage
const data = JSON.parse(localStorage.getItem('chillapp_data'));

// Subir a Supabase usando la API
fetch('https://TU_PROYECTO.supabase.co/rest/v1/students', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': 'TU_ANON_KEY',
    'Prefer': 'return=minimal'
  },
  body: JSON.stringify(data.students)
});

// Para registros diarios
Object.values(data.dailyRecords).forEach(record => {
  fetch('https://TU_PROYECTO.supabase.co/rest/v1/daily_records', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': 'TU_ANON_KEY',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      date: record.date,
      day_name: record.dayName,
      entries: record.entries
    })
  });
});
```

## Paso 7: Verificar el deployment

1. Una vez desplegado, Vercel te dará una URL (ej: `chillouts.vercel.app`)
2. Abre la aplicación y verifica que:
   - Los estudiantes se cargan correctamente
   - Puedes agregar nuevos estudiantes
   - Los registros diarios se guardan
   - Los reportes funcionan

## Troubleshooting

### Los datos no se guardan
- Verifica que las variables de entorno estén configuradas correctamente en Vercel
- Revisa la consola del navegador para errores
- Verifica que las políticas RLS en Supabase permitan las operaciones

### Error de conexión a Supabase
- Verifica que la URL y la clave sean correctas
- Asegúrate de que el proyecto de Supabase esté activo
- Revisa los logs en Vercel para más detalles

### La aplicación funciona en local pero no en producción
- Verifica que todas las variables de entorno estén configuradas
- Asegúrate de que el build se complete sin errores
- Revisa los logs de Vercel en la sección "Deployments"

## Costos

- **Vercel**: Gratis para proyectos personales (hasta 100GB bandwidth/mes)
- **Supabase**: Gratis hasta 500MB de base de datos y 2GB de bandwidth/mes

Para proyectos más grandes, ambos servicios tienen planes de pago razonables.

## Actualizaciones futuras

Cada vez que hagas push a la rama `main` en GitHub, Vercel desplegará automáticamente los cambios.

