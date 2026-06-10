# ============================================================
#  INSTALACION LOCAL — Taller Mecánico / Refaccionaria
#  Ejecuta este script UNA SOLA VEZ para instalar todo
#  PowerShell: clic derecho → "Ejecutar con PowerShell"
# ============================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  INSTALACION DEL SISTEMA DE TALLER     " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── Verificar Node.js ─────────────────────────────────────────
Write-Host "Verificando Node.js..." -ForegroundColor Yellow
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Node.js no esta instalado." -ForegroundColor Red
    Write-Host "Descargalo en: https://nodejs.org (version LTS)" -ForegroundColor Red
    Read-Host "Presiona Enter para cerrar"
    exit 1
}
$nodeVersion = node --version
Write-Host "  Node.js $nodeVersion encontrado" -ForegroundColor Green

# ── Verificar PostgreSQL ──────────────────────────────────────
Write-Host "Verificando PostgreSQL..." -ForegroundColor Yellow
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    Write-Host "AVISO: psql no encontrado en PATH." -ForegroundColor Yellow
    Write-Host "  Si ya instalaste PostgreSQL, continua de todas formas." -ForegroundColor Yellow
}

# ── Verificar que existe el .env ──────────────────────────────
Write-Host "Verificando configuracion..." -ForegroundColor Yellow
if (-not (Test-Path "backend\.env")) {
    Write-Host ""
    Write-Host "  No existe backend\.env" -ForegroundColor Red
    Write-Host "  Copia backend\.env.local.example a backend\.env" -ForegroundColor Yellow
    Write-Host "  y edita la contrasena de PostgreSQL antes de continuar." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Presiona Enter para cerrar"
    exit 1
}
Write-Host "  backend\.env encontrado" -ForegroundColor Green

# ── Instalar dependencias del backend ─────────────────────────
Write-Host ""
Write-Host "Instalando dependencias del backend..." -ForegroundColor Yellow
Set-Location backend
npm install --omit=dev 2>&1 | Select-Object -Last 3
Write-Host "  Backend listo" -ForegroundColor Green

# ── Migrar base de datos ──────────────────────────────────────
Write-Host "Aplicando migraciones a la base de datos..." -ForegroundColor Yellow
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR en migraciones. Verifica DATABASE_URL en backend\.env" -ForegroundColor Red
    Set-Location ..
    Read-Host "Presiona Enter para cerrar"
    exit 1
}
Write-Host "  Base de datos lista" -ForegroundColor Green

Set-Location ..

# ── Instalar y construir el frontend ─────────────────────────
Write-Host ""
Write-Host "Construyendo el frontend..." -ForegroundColor Yellow
Set-Location frontend
npm install 2>&1 | Select-Object -Last 3

# Build apuntando al backend local
$env:VITE_API_URL = "/api"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR al construir el frontend." -ForegroundColor Red
    Set-Location ..
    Read-Host "Presiona Enter para cerrar"
    exit 1
}
Write-Host "  Frontend construido" -ForegroundColor Green
Set-Location ..

# ── Instalar PM2 ─────────────────────────────────────────────
Write-Host ""
Write-Host "Instalando PM2 (administrador de procesos)..." -ForegroundColor Yellow
npm install -g pm2
Write-Host "  PM2 instalado" -ForegroundColor Green

# ── Crear archivo de configuracion PM2 ───────────────────────
$pm2Config = @'
{
  "apps": [{
    "name": "taller-sistema",
    "script": "npx",
    "args": "tsx src/index.ts",
    "cwd": "./backend",
    "env": { "NODE_ENV": "production" },
    "restart_delay": 3000,
    "max_restarts": 10,
    "watch": false,
    "log_date_format": "YYYY-MM-DD HH:mm:ss",
    "error_file": "./logs/error.log",
    "out_file": "./logs/out.log"
  }]
}
'@
New-Item -ItemType Directory -Force -Path "logs" | Out-Null
$pm2Config | Out-File -FilePath "ecosystem.config.json" -Encoding utf8
Write-Host "  Configuracion PM2 creada" -ForegroundColor Green

# ── Iniciar el sistema ────────────────────────────────────────
Write-Host ""
Write-Host "Iniciando el sistema..." -ForegroundColor Yellow
pm2 start ecosystem.config.json
pm2 save

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  INSTALACION COMPLETADA               " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  El sistema esta corriendo en:" -ForegroundColor White
Write-Host "  http://localhost:4000" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Para que arranque automatico al iniciar Windows," -ForegroundColor White
Write-Host "  ejecuta este comando en PowerShell como Administrador:" -ForegroundColor White
Write-Host "  pm2 startup" -ForegroundColor Yellow
Write-Host "  (luego copia y pega el comando que te muestre)" -ForegroundColor White
Write-Host ""
Read-Host "Presiona Enter para cerrar"
