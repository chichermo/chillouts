# Chill-outs Beheer App

Aplicación web para gestionar chill-outs de estudiantes, reemplazando el sistema Excel anterior.

## Características

- ✅ **Gestión de Estudiantes**: Agregar, editar y eliminar estudiantes por clase
- ✅ **Registro Diario**: Registrar chill-outs por estudiante y hora (1-7) con opciones VR/VL
- ✅ **Cálculos Automáticos**: Total de chill-outs, VR y VL por hora y por día
- ✅ **Vista Semanal**: Resumen de totales por clase y día de la semana
- ✅ **Persistencia Local**: Los datos se guardan automáticamente en el navegador
- ✅ **Interfaz en Holandés**: Toda la interfaz está en holandés como el Excel original

## Instalación

1. Instala las dependencias:
```bash
npm install
```

2. Inicia el servidor de desarrollo:
```bash
npm run dev
```

3. Abre [http://localhost:3000](http://localhost:3000) en tu navegador

## Uso

### Gestión de Estudiantes
- Ve a "Beheer Studenten" para agregar, editar o eliminar estudiantes
- Los estudiantes se organizan por clase (Klas)
- Solo los estudiantes "Actief" aparecen en los registros diarios

### Registro Diario
- Ve a "Dagelijks Overzicht" y selecciona un día
- Para cada estudiante y hora (1-7), selecciona:
  - Vacío (sin chill-outs)
  - 1 VR / 1 VL
  - 2 VR / 2 VL
  - 3 VR / 3 VL
- Los totales se calculan automáticamente

### Vista Semanal
- Ve a "Weekoverzicht" para ver resúmenes semanales
- Selecciona la semana deseada
- Ve totales por clase, día, VR, VL y promedios

## Importar Datos del Excel

Si deseas importar datos existentes del Excel:

1. Ejecuta el script de importación:
```bash
python scripts/import_excel.py
```

2. Esto generará un archivo `imported_data.json`

3. Para importar en la aplicación:
   - Abre la consola del navegador (F12)
   - Copia el contenido de `imported_data.json`
   - Ejecuta: `localStorage.setItem('chillapp_data', CONTENIDO_JSON)`
   - Recarga la página

## Estructura del Proyecto

```
chillapp/
├── app/              # Páginas de Next.js
│   ├── students/     # Gestión de estudiantes
│   ├── daily/        # Registros diarios
│   └── weekly/       # Vista semanal
├── lib/              # Utilidades y almacenamiento
├── types/            # Tipos TypeScript
└── scripts/          # Scripts de utilidad
```

## Tecnologías

- **Next.js 14**: Framework React
- **TypeScript**: Tipado estático
- **Tailwind CSS**: Estilos
- **LocalStorage**: Persistencia de datos

## Notas

- Los datos se guardan localmente en el navegador
- Para respaldar datos, exporta desde la consola del navegador
- La aplicación funciona completamente offline después de la carga inicial

