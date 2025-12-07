# Script para actualizar colores en archivos TypeScript/TSX
# Este script ayuda a aplicar la nueva paleta de colores de forma sistemática

Write-Host "Actualizando colores en archivos..." -ForegroundColor Green

# Lista de archivos a actualizar
$files = @(
    "app/students/page.tsx",
    "app/daily/page.tsx",
    "app/daily/[date]/page.tsx",
    "app/weekly/page.tsx",
    "app/stats/page.tsx",
    "app/import/page.tsx",
    "app/audit/page.tsx"
)

Write-Host "Archivos encontrados: $($files.Count)" -ForegroundColor Yellow

