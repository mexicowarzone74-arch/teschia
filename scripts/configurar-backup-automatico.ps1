# ================================================
# CONFIGURAR BACKUP AUTOMATICO - SISTEMA TESCHA
# ================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   CONFIGURAR BACKUP AUTOMATICO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar permisos de administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ESTE SCRIPT REQUIERE PERMISOS DE ADMINISTRADOR" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor:" -ForegroundColor Yellow
    Write-Host "1. Cierra esta ventana" -ForegroundColor White
    Write-Host "2. Haz clic derecho en PowerShell" -ForegroundColor White
    Write-Host "3. Selecciona 'Ejecutar como administrador'" -ForegroundColor White
    Write-Host "4. Ejecuta este script nuevamente" -ForegroundColor White
    Write-Host ""
    Read-Host "Presiona Enter para salir"
    exit
}

Write-Host "Permisos de administrador: OK" -ForegroundColor Green
Write-Host ""

# Obtener ruta actual
$scriptPath = $PSScriptRoot
$backupScript = Join-Path $scriptPath "backup-tescha.ps1"

if (-not (Test-Path $backupScript)) {
    Write-Host "ERROR: No se encontro backup-tescha.ps1" -ForegroundColor Red
    Write-Host "Ubicacion esperada: $backupScript" -ForegroundColor Yellow
    Read-Host "Presiona Enter para salir"
    exit
}

Write-Host "Script de backup encontrado: OK" -ForegroundColor Green
Write-Host ""

# Preguntar frecuencia
Write-Host "Selecciona la frecuencia de backups automaticos:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Diario (todos los dias a las 2:00 AM)" -ForegroundColor White
Write-Host "  2. Semanal (domingos a las 2:00 AM)" -ForegroundColor White
Write-Host "  3. Personalizado" -ForegroundColor White
Write-Host ""

$opcion = Read-Host "Opcion (1-3)"

$taskName = "TESCHA-Backup-Automatico"
$taskDescription = "Backup automatico de la base de datos TESCHA"
$hora = "02:00"

# Configurar trigger segun opcion
switch ($opcion) {
    "1" {
        $trigger = New-ScheduledTaskTrigger -Daily -At $hora
        $frecuencia = "Diario a las 2:00 AM"
    }
    "2" {
        $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At $hora
        $frecuencia = "Semanal (domingos) a las 2:00 AM"
    }
    "3" {
        Write-Host ""
        Write-Host "Configuracion personalizada:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Dias de la semana:" -ForegroundColor Yellow
        Write-Host "  1 = Lunes, 2 = Martes, 3 = Miercoles, 4 = Jueves" -ForegroundColor Gray
        Write-Host "  5 = Viernes, 6 = Sabado, 7 = Domingo" -ForegroundColor Gray
        Write-Host ""
        $dias = Read-Host "Ingresa los dias separados por coma (ej: 1,3,5)"
        $horaPersonalizada = Read-Host "Hora de ejecucion (formato 24h, ej: 14:30)"
        
        $diasArray = $dias -split "," | ForEach-Object { $_.Trim() }
        $diasNombres = @{
            "1" = "Monday"; "2" = "Tuesday"; "3" = "Wednesday"; "4" = "Thursday"
            "5" = "Friday"; "6" = "Saturday"; "7" = "Sunday"
        }
        
        $daysOfWeek = @()
        foreach ($dia in $diasArray) {
            if ($diasNombres.ContainsKey($dia)) {
                $daysOfWeek += $diasNombres[$dia]
            }
        }
        
        $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $daysOfWeek -At $horaPersonalizada
        $frecuencia = "Personalizado: $dias a las $horaPersonalizada"
        $hora = $horaPersonalizada
    }
    default {
        Write-Host ""
        Write-Host "Opcion invalida. Usando configuracion por defecto (semanal)" -ForegroundColor Yellow
        $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At $hora
        $frecuencia = "Semanal (domingos) a las 2:00 AM"
    }
}

Write-Host ""
Write-Host "Configurando tarea programada..." -ForegroundColor Yellow
Write-Host "  Nombre: $taskName" -ForegroundColor Gray
Write-Host "  Frecuencia: $frecuencia" -ForegroundColor Gray
Write-Host "  Script: $backupScript" -ForegroundColor Gray
Write-Host ""

# Configurar accion
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$backupScript`"" `
    -WorkingDirectory $scriptPath

# Configurar settings
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable:$false `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1)

# Configurar principal (ejecutar con usuario actual)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -RunLevel Highest

# Eliminar tarea si existe
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "Eliminando tarea anterior..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Registrar nueva tarea
try {
    Register-ScheduledTask `
        -TaskName $taskName `
        -Description $taskDescription `
        -Trigger $trigger `
        -Action $action `
        -Settings $settings `
        -Principal $principal | Out-Null
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "   BACKUP AUTOMATICO CONFIGURADO" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Detalles de la configuracion:" -ForegroundColor Cyan
    Write-Host "  Frecuencia: $frecuencia" -ForegroundColor White
    Write-Host "  Ubicacion backups: $scriptPath\backups\" -ForegroundColor White
    Write-Host "  Retencion: 30 dias" -ForegroundColor White
    Write-Host ""
    Write-Host "Comandos utiles:" -ForegroundColor Yellow
    Write-Host "  Ver estado: Get-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
    Write-Host "  Ejecutar ahora: Start-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
    Write-Host "  Deshabilitar: Disable-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
    Write-Host "  Eliminar: Unregister-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
    Write-Host ""
    
    # Preguntar si quiere probar ahora
    Write-Host "Deseas ejecutar un backup de prueba ahora? (S/N): " -ForegroundColor Cyan -NoNewline
    $respuesta = Read-Host
    
    if ($respuesta -eq "S" -or $respuesta -eq "s") {
        Write-Host ""
        Write-Host "Ejecutando backup de prueba..." -ForegroundColor Yellow
        Start-ScheduledTask -TaskName $taskName
        Start-Sleep -Seconds 5
        
        # Verificar resultado
        $taskInfo = Get-ScheduledTaskInfo -TaskName $taskName
        if ($taskInfo.LastTaskResult -eq 0) {
            Write-Host "Backup de prueba: EXITOSO" -ForegroundColor Green
        } else {
            Write-Host "Backup de prueba: Revisa los logs" -ForegroundColor Yellow
        }
    }
    
} catch {
    Write-Host ""
    Write-Host "ERROR al configurar la tarea:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
}

Write-Host ""
Read-Host "Presiona Enter para continuar"
