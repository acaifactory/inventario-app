# Publica inventario-app en GitHub + Vercel (ejecutar en la carpeta del proyecto)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "=== Publicar Inventario Açaí Factory ===" -ForegroundColor Cyan

# Git author (debe coincidir con GitHub: acaifactorypr@gmail.com)
git config user.email "acaifactorypr@gmail.com"
git config user.name "acaifactory"

# 1. GitHub
Write-Host "`n[1/3] GitHub..." -ForegroundColor Yellow
$ghOk = $false
try {
  gh auth status 2>$null | Out-Null
  $ghOk = $true
} catch {
  Write-Host "  Ejecuta primero: gh auth login" -ForegroundColor Red
  Write-Host "  Luego vuelve a correr este script." -ForegroundColor Red
}

if ($ghOk) {
  $remote = git remote get-url origin 2>$null
  if (-not $remote) {
    git remote add origin https://github.com/acaifactory/inventario-app.git
  }
  $status = git status --porcelain
  if ($status) {
    git add -A
    git commit -m "Actualizacion inventario y food cost"
  }
  gh repo view acaifactory/inventario-app 2>$null
  if ($LASTEXITCODE -ne 0) {
    gh repo create inventario-app --public --source=. --remote=origin --push
  } else {
    git push -u origin main
  }
  Write-Host "  GitHub OK" -ForegroundColor Green
}

# 2. Vercel produccion
Write-Host "`n[2/3] Vercel produccion..." -ForegroundColor Yellow
npx vercel deploy --prod --yes
Write-Host "  Vercel OK" -ForegroundColor Green

# 3. Conectar Git en Vercel (deploy automatico en cada push)
Write-Host "`n[3/3] Conectar Git en Vercel..." -ForegroundColor Yellow
if ($ghOk) {
  npx vercel git connect --yes 2>&1
}

Write-Host "`n=== LISTO ===" -ForegroundColor Green
Write-Host "App: https://inventario-app-blond-eight.vercel.app"
Write-Host "Login: admin@acaifactory.com / admin123"
