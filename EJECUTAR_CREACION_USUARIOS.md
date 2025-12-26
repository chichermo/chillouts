# Ejecutar Creación de Usuarios

## Opción 1: Desde la Interfaz Web (Recomendado)

1. **Asegúrate de que el schema de usuarios esté ejecutado en Supabase:**
   - Ve a Supabase Dashboard > SQL Editor
   - Ejecuta el contenido de `supabase/users_schema.sql`

2. **Inicia sesión como Admin:**
   - Usuario: `Admin`
   - Contraseña: `Perritopony555`

3. **Ve a la página de creación de usuarios:**
   - Navega a: `/create-users-execute`
   - O ve a "Gebruikers" en el menú y luego haz clic en el botón especial

4. **Ejecuta la creación:**
   - Haz clic en "Crear Todos los Usuarios"
   - Espera a que se completen los 53 usuarios
   - Descarga las credenciales (TXT o JSON)

## Opción 2: Desde la API Route (Línea de Comandos)

Si el servidor está corriendo (`npm run dev`):

```powershell
# PowerShell
Invoke-RestMethod -Uri "http://localhost:3000/api/create-all-users" -Method POST -ContentType "application/json" | ConvertTo-Json -Depth 10
```

```bash
# Bash/CMD
curl -X POST http://localhost:3000/api/create-all-users -H "Content-Type: application/json"
```

## Opción 3: Script Node.js Directo

1. Configura las variables de entorno en `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon
   ```

2. Ejecuta el script:
   ```bash
   node scripts/create-users-direct.js
   ```

## Lista de Usuarios que se Crearán

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

**Total: 53 usuarios**

## Notas Importantes

- ⚠️ **Solo ejecuta la creación UNA VEZ**
- Las contraseñas se generan automáticamente y son seguras (10 caracteres)
- Después de crear los usuarios, descarga y guarda las credenciales en un lugar seguro
- Las credenciales se guardarán en `users-credentials.json` y `users-credentials.txt`

