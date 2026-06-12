# Despliegue automático a Vercel + Neon
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "=== Despliegue Inventario Açaí Factory ===" -ForegroundColor Cyan

# 1. Instalar integración Neon (requiere aceptar términos una vez)
Write-Host "`nPaso 1: Conectar base de datos Neon..." -ForegroundColor Yellow
$neonResult = npx vercel integration add neon 2>&1 | Out-String
Write-Host $neonResult

if ($neonResult -match "verification_uri") {
    if ($neonResult -match '"verification_uri":\s*"([^"]+)"') {
        $url = $Matches[1]
        Write-Host "`n>>> Abre este enlace y acepta los términos:" -ForegroundColor Red
        Write-Host $url -ForegroundColor White
        Start-Process $url
        Write-Host "`nEsperando 60 segundos para que aceptes..." -ForegroundColor Yellow
        Start-Sleep -Seconds 60
        npx vercel integration add neon
    }
}

# 2. Verificar variables
Write-Host "`nPaso 2: Variables de entorno..." -ForegroundColor Yellow
npx vercel env ls

# 3. Desplegar
Write-Host "`nPaso 3: Desplegando a producción..." -ForegroundColor Yellow
npx vercel deploy --prod --yes

# 4. Seed (con URL de producción)
Write-Host "`nPaso 4: Cargar datos iniciales..." -ForegroundColor Yellow
npx vercel env pull .env.production.local --environment=production --yes
if (Test-Path .env.production.local) {
    $envContent = Get-Content .env.production.local -Raw
    if ($envContent -match 'DATABASE_URL="([^"]+)"') {
        $env:DATABASE_URL = $Matches[1]
        npm run db:seed
        Write-Host "Datos cargados correctamente." -ForegroundColor Green
    }
}

Write-Host "`n=== LISTO ===" -ForegroundColor Green
npx vercel ls inventario-app 2>&1
