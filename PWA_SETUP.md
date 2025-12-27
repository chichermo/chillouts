# Configuración PWA (Progressive Web App)

La aplicación está configurada como PWA para poder instalarse en dispositivos móviles como una app nativa.

## Iconos Requeridos

Para completar la configuración PWA, necesitas crear dos iconos desde `logo.jpg`:

1. **icon-192.png** - 192x192 píxeles
2. **icon-512.png** - 512x512 píxeles

### Opción 1: Usar el script incluido

```bash
# Instalar sharp (herramienta para procesar imágenes)
npm install sharp --save-dev

# Ejecutar el script
node scripts/generate-icons.js
```

### Opción 2: Usar herramienta online

1. Ve a https://realfavicongenerator.net/
2. Sube `public/logo.jpg`
3. Descarga los iconos generados
4. Guarda como:
   - `public/icon-192.png`
   - `public/icon-512.png`

### Opción 3: Crear manualmente

Usa cualquier editor de imágenes (Photoshop, GIMP, etc.) para crear:
- `public/icon-192.png` (192x192 píxeles)
- `public/icon-512.png` (512x512 píxeles)

Desde `public/logo.jpg`, asegúrate de que el fondo sea `#2a2a3a` (el color del tema).

## Instalación en Dispositivos

### Android (Chrome)

1. Abre la aplicación en Chrome
2. Toca el menú (3 puntos)
3. Selecciona "Agregar a pantalla de inicio" o "Instalar app"
4. La app aparecerá como una app nativa

### iOS (Safari)

1. Abre la aplicación en Safari
2. Toca el botón de compartir (cuadrado con flecha)
3. Selecciona "Agregar a pantalla de inicio"
4. La app aparecerá como una app nativa

### Desktop (Chrome/Edge)

1. Abre la aplicación en Chrome o Edge
2. Busca el icono de instalación en la barra de direcciones
3. Haz clic en "Instalar"
4. La app se abrirá en una ventana independiente

## Archivos de Configuración

- `public/manifest.json` - Configuración del manifest PWA
- `public/sw.js` - Service Worker básico para cacheo offline
- `app/layout.tsx` - Meta tags y referencias al manifest

## Notas

- El service worker está configurado para cachear las páginas principales
- Los datos se siguen sincronizando con Supabase cuando hay conexión
- La app funciona offline para navegación básica, pero requiere conexión para guardar datos

