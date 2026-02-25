# ================================================
# SCRIPT DE BACKUP - SISTEMA TESCHA (PowerShell)
# ================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   BACKUP AUTOMATICO DE TESCHA" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Crear carpeta de backups si no existe
$backupDir = "backups"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
    Write-Host "[OK] Carpeta de backups creada" -ForegroundColor Green
}

# Obtener fecha y hora
$fecha = Get-Date -Format "yyyyMMdd_HHmm"
$archivo = "$backupDir\tescha_backup_$fecha.sql"

Write-Host "[1/3] Creando backup de la base de datos..." -ForegroundColor Yellow
Write-Host ""

try {
    # Ejecutar pg_dump
    $env:PGPASSWORD = "1234"  # Cambiar por tu password de PostgreSQL
    & pg_dump -U postgres -d tescha_db | Out-File -FilePath $archivo -Encoding UTF8
    
    if (Test-Path $archivo) {
        $tamano = (Get-Item $archivo).Length
        $tamanoMB = [math]::Round($tamano / 1MB, 2)
        
        Write-Host ""
        Write-Host "[2/3] [OK] Backup completado exitosamente!" -ForegroundColor Green
        Write-Host "      Archivo: $archivo" -ForegroundColor White
        Write-Host "      Tamano: $tamanoMB MB" -ForegroundColor White
        
        Write-Host ""
        Write-Host "[3/3] Limpiando backups antiguos (mas de 30 dias)..." -ForegroundColor Yellow
        
        # Eliminar backups mas antiguos de 30 dias
        $fecha_limite = (Get-Date).AddDays(-30)
        Get-ChildItem -Path $backupDir -Filter "*.sql" | 
        Where-Object { $_.LastWriteTime -lt $fecha_limite } | 
        ForEach-Object {
            Remove-Item $_.FullName
            Write-Host "  - Eliminado: $($_.Name)" -ForegroundColor Gray
        }
        
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "   BACKUP COMPLETADO EXITOSAMENTE" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        
    }
    else {
        throw "El archivo de backup no se creo correctamente"
    }
    
}
catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "   ERROR EN EL BACKUP" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Verifica que:" -ForegroundColor Yellow
    Write-Host "1. PostgreSQL este instalado" -ForegroundColor White
    Write-Host "2. La base de datos 'tescha_db' exista" -ForegroundColor White
    Write-Host "3. El usuario 'postgres' tenga permisos" -ForegroundColor White
    Write-Host "4. La contrasena en el script sea correcta" -ForegroundColor White
    Write-Host ""
}

# Remover password del entorno
Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue

Read-Host "Presiona Enter para continuar"
