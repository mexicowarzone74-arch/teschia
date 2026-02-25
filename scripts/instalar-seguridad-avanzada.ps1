#!/usr/bin/env pwsh
# Script para aplicar todas las mejoras de seguridad
# Sistema 100% Anti-Pendejos - TESCHA

Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "  INSTALADOR DE SISTEMA ANTI-PENDEJOS - TESCHA" -ForegroundColor Yellow
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host ""

# Colores
$ColorExito = "Green"
$ColorError = "Red"
$ColorInfo = "Cyan"
$ColorAdvertencia = "Yellow"

# Verificar si estamos en el directorio correcto
if (-not (Test-Path "backend\server.js")) {
    Write-Host "Error: Ejecuta este script desde el directorio raiz de TESCHA" -ForegroundColor $ColorError
    exit 1
}

Write-Host "Verificando requisitos..." -ForegroundColor $ColorInfo

# Verificar Node.js
try {
    $nodeVersion = node --version
    Write-Host "Node.js encontrado: $nodeVersion" -ForegroundColor $ColorExito
} catch {
    Write-Host "Node.js no encontrado. Por favor instalalo primero." -ForegroundColor $ColorError
    exit 1
}

# Verificar PostgreSQL
try {
    $psqlVersion = psql --version
    Write-Host "PostgreSQL encontrado: $psqlVersion" -ForegroundColor $ColorExito
} catch {
    Write-Host "PostgreSQL no encontrado en PATH. Asegurate de tenerlo instalado." -ForegroundColor $ColorAdvertencia
}

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "  PASO 1: Instalar dependencias del backend" -ForegroundColor Yellow
Write-Host "===============================================================" -ForegroundColor Cyan

cd backend

Write-Host "Instalando paquetes npm..." -ForegroundColor $ColorInfo
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "Dependencias instaladas correctamente" -ForegroundColor $ColorExito
} else {
    Write-Host "Error al instalar dependencias" -ForegroundColor $ColorError
    exit 1
}

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "  PASO 2: Aplicar migraciones de base de datos" -ForegroundColor Yellow
Write-Host "===============================================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "Se aplicara la migracion de eventos de seguridad" -ForegroundColor $ColorInfo
Write-Host ""

$dbUser = Read-Host "Usuario de PostgreSQL [postgres]"
if ([string]::IsNullOrWhiteSpace($dbUser)) {
    $dbUser = "postgres"
}

$dbPass = Read-Host "Contrasena de PostgreSQL (dejar vacio si no tiene)"
$dbName = Read-Host "Nombre de la base de datos [tescha_db]"
if ([string]::IsNullOrWhiteSpace($dbName)) {
    $dbName = "tescha_db"
}

$dbHost = Read-Host "Host de PostgreSQL [localhost]"
if ([string]::IsNullOrWhiteSpace($dbHost)) {
    $dbHost = "localhost"
}

$dbPort = Read-Host "Puerto de PostgreSQL [5432]"
if ([string]::IsNullOrWhiteSpace($dbPort)) {
    $dbPort = "5432"
}

Write-Host ""
Write-Host "Aplicando migracion..." -ForegroundColor $ColorInfo

$migracionPath = "database\migrations\006_create_security_events_table_postgresql.sql"

if (Test-Path $migracionPath) {
    try {
        if ([string]::IsNullOrWhiteSpace($dbPass)) {
            # Sin contrasena
            $output = Get-Content $migracionPath | psql -h $dbHost -p $dbPort -U $dbUser -d $dbName 2>&1
        } else {
            # Con contrasena
            $env:PGPASSWORD = $dbPass
            $output = Get-Content $migracionPath | psql -h $dbHost -p $dbPort -U $dbUser -d $dbName 2>&1
            Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Migracion aplicada exitosamente" -ForegroundColor $ColorExito
        } else {
            Write-Host "Advertencia al aplicar migracion" -ForegroundColor $ColorAdvertencia
            Write-Host "    Puede ser que ya exista o hay un error de conexion" -ForegroundColor $ColorAdvertencia
            if ($output) {
                Write-Host "    Salida: $output" -ForegroundColor Gray
            }
        }
    } catch {
        Write-Host "Error al aplicar migracion: $_" -ForegroundColor $ColorAdvertencia
        Write-Host "    Puedes aplicarla manualmente despues con:" -ForegroundColor $ColorInfo
        Write-Host "    psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f $migracionPath" -ForegroundColor White
    }
} else {
    Write-Host "Archivo de migracion no encontrado: $migracionPath" -ForegroundColor $ColorAdvertencia
}

cd ..

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "  PASO 3: Instalar dependencias del frontend" -ForegroundColor Yellow
Write-Host "===============================================================" -ForegroundColor Cyan

cd frontend

Write-Host "Instalando paquetes npm..." -ForegroundColor $ColorInfo
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "Dependencias instaladas correctamente" -ForegroundColor $ColorExito
} else {
    Write-Host "Error al instalar dependencias" -ForegroundColor $ColorError
    cd ..
    exit 1
}

cd ..

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "  PASO 4: Verificar archivos creados" -ForegroundColor Yellow
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host ""

$archivosNuevos = @(
    "frontend\src\hooks\useFormValidation.js",
    "frontend\src\hooks\usePreventDoubleSubmit.js",
    "frontend\src\components\ConfirmDialog.jsx",
    "frontend\src\components\InlineConfirm.jsx",
    "frontend\src\utils\inputSanitizer.js",
    "backend\middleware\antiSpam.js",
    "backend\middleware\sessionSecurity.js",
    "backend\middleware\businessRules.js",
    "backend\database\migrations\006_create_security_events_table_postgresql.sql"
)

$todosExisten = $true

foreach ($archivo in $archivosNuevos) {
    if (Test-Path $archivo) {
        Write-Host "$archivo" -ForegroundColor $ColorExito
    } else {
        Write-Host "$archivo NO ENCONTRADO" -ForegroundColor $ColorError
        $todosExisten = $false
    }
}

Write-Host ""

if ($todosExisten) {
    Write-Host "===============================================================" -ForegroundColor Green
    Write-Host "  INSTALACION COMPLETADA EXITOSAMENTE" -ForegroundColor Green
    Write-Host "===============================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "El sistema ahora es 100% ANTI-PENDEJOS!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Nuevas caracteristicas instaladas:" -ForegroundColor $ColorInfo
    Write-Host "  - Validacion avanzada de formularios" -ForegroundColor White
    Write-Host "  - Prevencion de double-submit" -ForegroundColor White
    Write-Host "  - Dialogos de confirmacion" -ForegroundColor White
    Write-Host "  - Middleware anti-spam" -ForegroundColor White
    Write-Host "  - Seguridad de sesion mejorada" -ForegroundColor White
    Write-Host "  - Validacion de reglas de negocio" -ForegroundColor White
    Write-Host "  - Sanitizacion de inputs" -ForegroundColor White
    Write-Host "  - Socket.io mejorado" -ForegroundColor White
    Write-Host "  - Sistema de eventos de seguridad" -ForegroundColor White
    Write-Host ""
    Write-Host "Lee el archivo SISTEMA-ANTI-PENDEJOS.md para mas detalles" -ForegroundColor $ColorInfo
    Write-Host ""
    Write-Host "Para iniciar el sistema:" -ForegroundColor $ColorInfo
    Write-Host "  .\iniciar-tescha.bat" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "===============================================================" -ForegroundColor Red
    Write-Host "  INSTALACION INCOMPLETA" -ForegroundColor Red
    Write-Host "===============================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Algunos archivos no se encontraron." -ForegroundColor $ColorAdvertencia
    Write-Host "Por favor verifica los errores anteriores." -ForegroundColor $ColorAdvertencia
}

Write-Host ""
Write-Host "Presiona Enter para salir..." -ForegroundColor Gray
Read-Host
