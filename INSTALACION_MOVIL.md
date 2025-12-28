# 📱 Guía de Instalación en Dispositivos Móviles

La aplicación está configurada como **PWA (Progressive Web App)** y puede instalarse como una app nativa en dispositivos móviles.

## ⚠️ Requisito Previo

**La aplicación debe estar desplegada en producción** (Vercel) para que la instalación funcione correctamente. No funciona en `localhost` o en desarrollo local.

## 📲 Instalación en Android (Chrome)

### Método 1: Banner de Instalación Automático

1. Abre la aplicación en **Chrome** desde tu dispositivo Android
2. Si la app es instalable, aparecerá un **banner en la parte inferior** que dice "Agregar a pantalla de inicio" o "Instalar app"
3. Toca el botón **"Instalar"** o **"Agregar"**
4. Confirma la instalación
5. La app aparecerá en tu pantalla de inicio con el icono de "Chill-outs Beheer"

### Método 2: Menú de Chrome

1. Abre la aplicación en **Chrome**
2. Toca el **menú de tres puntos** (⋮) en la esquina superior derecha
3. Busca la opción **"Agregar a pantalla de inicio"** o **"Instalar app"**
4. Toca la opción
5. Confirma el nombre de la app (puedes cambiarlo si quieres)
6. Toca **"Agregar"** o **"Instalar"**
7. La app aparecerá en tu pantalla de inicio

### Método 3: Configuración de Chrome

1. Abre Chrome y ve a la aplicación
2. Toca el menú (⋮)
3. Ve a **"Configuración"** → **"Aplicaciones"** → **"Instalar aplicaciones"**
4. Busca "Chill-outs Beheer" en la lista
5. Toca **"Instalar"**

## 🍎 Instalación en iOS (iPhone/iPad)

### Pasos:

1. Abre **Safari** (no funciona en Chrome en iOS)
2. Ve a la URL de tu aplicación desplegada
3. Toca el **botón de compartir** (cuadrado con flecha hacia arriba) en la parte inferior
4. Desplázate hacia abajo en el menú de compartir
5. Toca **"Agregar a pantalla de inicio"** (icono de +)
6. Personaliza el nombre si quieres (por defecto será "Chill-outs Beheer")
7. Toca **"Agregar"** en la esquina superior derecha
8. La app aparecerá en tu pantalla de inicio con el icono

### Notas para iOS:

- **Solo funciona en Safari**, no en Chrome u otros navegadores
- La app se abrirá sin la barra de direcciones de Safari (modo standalone)
- Puedes organizarla en carpetas como cualquier otra app

## 💻 Instalación en Desktop (Chrome/Edge)

1. Abre la aplicación en **Chrome** o **Microsoft Edge**
2. Busca el **icono de instalación** (➕) en la barra de direcciones (lado derecho)
3. Haz clic en el icono
4. Se abrirá un diálogo preguntando si quieres instalar
5. Haz clic en **"Instalar"**
6. La app se abrirá en una ventana independiente sin la barra de direcciones del navegador

## ✅ Verificar que la Instalación Funciona

Después de instalar, deberías ver:

- ✅ Un icono en la pantalla de inicio con el logo de la app
- ✅ Al abrirla, se muestra sin la barra de direcciones del navegador
- ✅ Funciona como una app nativa (puedes cerrarla y volver a abrirla)
- ✅ Aparece en la lista de aplicaciones instaladas

## 🔧 Solución de Problemas

### No aparece el banner de instalación en Android

- Asegúrate de estar usando **Chrome** (no otros navegadores)
- Verifica que la app esté desplegada en **HTTPS** (Vercel lo hace automáticamente)
- Limpia la caché del navegador y vuelve a intentar
- Verifica que los iconos (`icon-192.png` y `icon-512.png`) existan en `public/`

### No aparece la opción en iOS

- **Debes usar Safari**, no Chrome u otros navegadores
- Asegúrate de que la app esté desplegada en producción
- Verifica que el manifest.json esté accesible en `/manifest.json`

### La app no se abre como standalone

- Verifica que el `manifest.json` tenga `"display": "standalone"`
- Asegúrate de que los meta tags estén correctos en `app/layout.tsx`

## 📝 Notas Importantes

- **Los datos se sincronizan con Supabase** cuando hay conexión a internet
- La app funciona **offline** para navegación básica, pero necesita conexión para guardar datos
- Puedes **desinstalar** la app como cualquier otra app nativa
- La app se **actualiza automáticamente** cuando hay cambios en el servidor

## 🎯 URL de Producción

Una vez desplegada en Vercel, la URL será algo como:
- `https://tu-app.vercel.app`

Comparte esta URL con los usuarios para que puedan instalar la app en sus dispositivos.

