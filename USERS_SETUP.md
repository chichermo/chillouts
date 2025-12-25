# Configuración de Usuarios

## Instrucciones para Crear Usuarios

### Paso 1: Ejecutar el Schema SQL

Ejecuta el siguiente SQL en Supabase para crear la tabla de usuarios:

```sql
-- Ver archivo: supabase/users_schema.sql
```

### Paso 2: Crear Usuarios

1. Inicia sesión como Admin (usuario: `Admin`, contraseña: `Perritopony555`)
2. Ve a la página `/create-users` (o haz clic en "Gebruikers" en el menú si eres admin)
3. Haz clic en "Alle Gebruikers Aanmaken"
4. Espera a que se creen todos los usuarios
5. Descarga el archivo de credenciales (TXT o JSON)

### Paso 3: Entregar Credenciales

El archivo descargado contiene todas las credenciales de usuarios que puedes entregar a cada persona.

## Roles y Permisos

### Admin
- Acceso completo a todas las funcionalidades
- Puede gestionar usuarios

### Full Access (Volledige Toegang)
- Acceso a: Dagelijks, Weekoverzicht, Statistieken, Rapporten, Students
- No puede gestionar usuarios ni ver audit log

### Dagelijks Access (Dagelijks + Rapporten)
- Acceso a: Dagelijks, Weekoverzicht, Statistieken, Rapporten
- No puede gestionar estudiantes ni usuarios

### Reports Access (Rapporten)
- Acceso a: Weekoverzicht, Statistieken, Rapporten
- Solo puede ver reportes y estadísticas

## Lista de Usuarios por Rol

### Full Access (3 usuarios)
- julie.gérard
- liesbeth.kreps
- annelore.delbecque

### Dagelijks Access (7 usuarios)
- lisa.floré
- yves.vanhoeserlande
- dennie.viaene
- jasmien.dantschotter
- peter.laloo
- warre.ballegeer
- dimitri.bottelberghe

### Reports Access (43 usuarios)
- gert.arickx
- manon.baert
- axel.barbier
- nicolas.boi
- loes.coudeville
- annie.debrabander
- nelia.decloedt
- jordin.decorte
- lorenzo.degrande
- saskia.delarue
- koen.deleu
- deborah.denys
- emma.depachter
- elke.derycke
- maaike.desmedt
- amelie.dewinter
- jutta.dewolf
- sirana.diet
- benoît.donche
- sven.geldof
- pascale.huart
- wout.leber
- anastasia.madan
- zoë.maes
- aaron.matthys
- brecht.merlevede
- sabine.mettepenningen
- eden.ramon
- eva.ranson
- kim.rosseel
- jeroen.tant
- leontine.vandenbussche
- daniek.vanhelsuwé
- jana.vannevel
- thieme.vanruymbeke
- jessie.verhaeghe
- lisa.verschuere
- stephanie.zanetic
- pieter-jan.vanhollebeke

## Notas Importantes

- Las contraseñas se generan automáticamente y son seguras
- Los usuarios pueden cambiar su contraseña desde la página de gestión (solo admins)
- Los usuarios inactivos no pueden iniciar sesión
- El usuario Admin inicial siempre está disponible como respaldo

