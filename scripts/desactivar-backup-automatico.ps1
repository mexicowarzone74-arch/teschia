# ================================================
# DESACTIVAR BACKUP AUTOMATICO - SISTEMA TESCHA
# ================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   DESACTIVAR BACKUP AUTOMATICO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar permisos de administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ESTE SCRIPT REQUIERE PERMISOS DE ADMINISTRADOR" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor ejecuta como administrador" -ForegroundColor Yellow
    Read-Host "Presiona Enter para salir"
    exit
}

$taskName = "TESCHA-Backup-Automatico"

# Verificar si existe la tarea
$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if (-not $task) {
    Write-Host "No hay backup automatico configurado" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Presiona Enter para continuar"
    exit
}

Write-Host "Tarea encontrada:" -ForegroundColor Green
Write-Host "  Nombre: $taskName" -ForegroundColor White
Write-Host "  Estado: $($task.State)" -ForegroundColor White
Write-Host ""

Write-Host "Que deseas hacer?" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Deshabilitar (mantener configuracion)" -ForegroundColor White
Write-Host "  2. Eliminar completamente" -ForegroundColor White
Write-Host "  3. Cancelar" -ForegroundColor White
Write-Host ""

$opcion = Read-Host "Opcion (1-3)"

switch ($opcion) {
    "1" {
        Disable-ScheduledTask -TaskName $taskName | Out-Null
        Write-Host ""
        Write-Host "Backup automatico DESHABILITADO" -ForegroundColor Yellow
        Write-Host "Puedes reactivarlo con: Enable-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
    }
    "2" {
        Write-Host ""
        Write-Host "CONFIRMAR: Deseas eliminar la tarea? (S/N): " -ForegroundColor Red -NoNewline
        $confirmar = Read-Host
        
        if ($confirmar -eq "S" -or $confirmar -eq "s") {
            Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
            Write-Host ""
            Write-Host "Backup automatico ELIMINADO" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "Operacion cancelada" -ForegroundColor Yellow
        }
    }
    default {
        Write-Host ""
        Write-Host "Operacion cancelada" -ForegroundColor Yellow
    }
}

Write-Host ""
Read-Host "Presiona Enter para continuar"
