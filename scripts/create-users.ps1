# Script PowerShell para crear todos los usuarios
# Ejecutar con: .\scripts\create-users.ps1

Write-Host "🚀 Iniciando creación de usuarios..." -ForegroundColor Green
Write-Host ""

# Esperar a que el servidor esté listo
Write-Host "Esperando a que el servidor esté listo..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Hacer petición a la API
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/create-all-users" -Method POST -ContentType "application/json"
    
    if ($response.success) {
        Write-Host ""
        Write-Host "✅ Usuarios creados exitosamente!" -ForegroundColor Green
        Write-Host "   Creados: $($response.created) de $($response.total)" -ForegroundColor Green
        
        if ($response.errors -and $response.errors.Count -gt 0) {
            Write-Host ""
            Write-Host "⚠️  Errores:" -ForegroundColor Yellow
            foreach ($error in $response.errors) {
                Write-Host "   - $($error.username): $($error.error)" -ForegroundColor Red
            }
        }
        
        Write-Host ""
        Write-Host "🔐 CREDENCIALES:" -ForegroundColor Cyan
        Write-Host "=" * 80
        
        foreach ($cred in $response.credentials) {
            Write-Host ""
            Write-Host "Usuario: $($cred.username)" -ForegroundColor White
            Write-Host "Contraseña: $($cred.password)" -ForegroundColor White
            Write-Host "Rol: $($cred.role)" -ForegroundColor White
            Write-Host "---"
        }
        
        # Guardar en archivo JSON
        $jsonPath = Join-Path $PSScriptRoot "..\users-credentials.json"
        $response.credentials | ConvertTo-Json -Depth 10 | Out-File -FilePath $jsonPath -Encoding UTF8
        Write-Host ""
        Write-Host "✓ Credenciales guardadas en: $jsonPath" -ForegroundColor Green
        
        # Guardar en archivo TXT
        $txtPath = Join-Path $PSScriptRoot "..\users-credentials.txt"
        $txtContent = $response.credentials | ForEach-Object {
            "Usuario: $($_.username)`nContraseña: $($_.password)`nRol: $($_.role)`n`n---`n`n"
        } | Out-String
        $txtContent | Out-File -FilePath $txtPath -Encoding UTF8
        Write-Host "✓ Credenciales guardadas en: $txtPath" -ForegroundColor Green
        
    } else {
        Write-Host "❌ Error: $($response.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error al conectar con el servidor: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Asegúrate de que:" -ForegroundColor Yellow
    Write-Host "1. El servidor de desarrollo esté corriendo (npm run dev)" -ForegroundColor Yellow
    Write-Host "2. El servidor esté escuchando en http://localhost:3000" -ForegroundColor Yellow
    Write-Host "3. Las variables de entorno de Supabase estén configuradas" -ForegroundColor Yellow
}

