# Chill-outs Beheer App

Aplicación web para gestionar chill-outs de estudiantes, reemplazando el sistema Excel anterior.

## Características

- ✅ **Gestión de Estudiantes**: Agregar, editar y eliminar estudiantes por clase
- ✅ **Registro Diario**: Registrar chill-outs por estudiante y hora (1-7) con opciones VR/VL
- ✅ **Cálculos Automáticos**: Total de chill-outs, VR y VL por hora y por día
- ✅ **Vista Semanal**: Resumen de totales por clase y día de la semana
- ✅ **Reportes Detallados**: Filtros avanzados y exportación a Excel/PDF
- ✅ **Base de Datos**: Integración con Supabase para persistencia en producción
- ✅ **Interfaz en Holandés**: Toda la interfaz está en holandés como el Excel original

## Instalación Local

1. Instala las dependencias:
```bash
npm install
```

2. Crea un archivo `.env.local` (opcional, para desarrollo local usa localStorage):
```bash
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon_de_supabase
```

3. Inicia el servidor de desarrollo:
```bash
npm run dev
```

4. Abre [http://localhost:3000](http://localhost:3000) en tu navegador

## Deployment en Producción

Para desplegar en producción con base de datos, sigue la guía completa en [DEPLOYMENT.md](./DEPLOYMENT.md)

### Resumen rápido:

1. **Crear cuenta en Supabase** (gratis)
2. **Ejecutar el schema SQL** (`supabase/schema.sql`) en Supabase
3. **Obtener credenciales** de Supabase (URL y anon key)
4. **Desplegar en Vercel** conectando tu repositorio de GitHub
5. **Configurar variables de entorno** en Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Uso

### Gestión de Estudiantes
- Ve a "Beheer Studenten" para agregar, editar o eliminar estudiantes
- Los estudiantes se organizan por clase (Klas)
- Solo los estudiantes "Actief" aparecen en los registros diarios

### Registro Diario
- Ve a "Dagelijks Overzicht" y selecciona un día
- Para cada estudiante y hora (1-7), selecciona:
  - VR (máximo 1 por hora)
  - VL (máximo 1 por hora)
  - Chill-outs genéricos (máximo 3 totales por hora)
- Los totales se calculan automáticamente

### Reportes
- Ve a "Rapporten" para ver estadísticas y generar reportes
- Filtra por clase, estudiante, fecha, etc.
- Exporta a Excel o PDF con información detallada

## Estructura del Proyecto

```
chillapp/
├── app/                    # Páginas Next.js
│   ├── page.tsx           # Dashboard principal
│   ├── students/          # Gestión de estudiantes
│   ├── daily/             # Registros diarios
│   ├── weekly/            # Vista semanal
│   ├── stats/             # Estadísticas
│   └── import/            # Reportes y exportación
├── lib/
│   ├── storage.ts         # Wrapper para storage (compatibilidad)
│   ├── storage-db.ts      # Storage con Supabase + localStorage fallback
│   ├── supabase.ts        # Cliente de Supabase
│   └── utils.ts           # Utilidades
├── components/
│   └── Navigation.tsx     # Navegación principal
├── types/
│   └── index.ts           # Tipos TypeScript
└── supabase/
    └── schema.sql         # Schema de base de datos
```

## Tecnologías

- **Next.js 14** - Framework React
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos
- **Supabase** - Base de datos PostgreSQL
- **Vercel** - Hosting y deployment
- **Chart.js** - Gráficos
- **jsPDF** - Exportación PDF
- **xlsx** - Exportación Excel

## Licencia

Este proyecto es privado.
