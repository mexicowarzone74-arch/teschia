# Script para configurar el archivo hosts con coordinacion-tescha.local
# Debe ejecutarse como Administrador

$hostsPath = "C:\Windows\System32\drivers\etc\hosts"
$hostEntry = "127.0.0.1    coordinacion-tescha.local"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   CONFIGURAR HOSTS - TESCHA" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Leer el archivo hosts actual
$hostsContent = Get-Content $hostsPath -Raw

# Verificar si ya existe la entrada
if ($hostsContent -match "coordinacion-tescha\.local") {
    Write-Host "✓ La entrada coordinacion-tescha.local ya existe en hosts" -ForegroundColor Green
    
    # Mostrar la línea actual
    $currentEntry = (Get-Content $hostsPath | Select-String "coordinacion-tescha.local").Line
    Write-Host "  Entrada actual: $currentEntry" -ForegroundColor Yellow
    Write-Host ""
    
    $response = Read-Host "¿Deseas actualizarla? (S/N)"
    if ($response -ne "S" -and $response -ne "s") {
        Write-Host "Configuración cancelada." -ForegroundColor Yellow
        exit
    }
    
    # Remover entradas antiguas
    $hostsContent = $hostsContent -replace ".*coordinacion-tescha\.local.*`r?`n?", ""
}

# Encontrar la posición antes de TailscaleHostsSectionStart
if ($hostsContent -match "# TailscaleHostsSectionStart") {
    # Insertar antes de la sección de Tailscale
    $hostsContent = $hostsContent -replace "(# TailscaleHostsSectionStart)", "$hostEntry`r`n`r`n`$1"
    Write-Host "✓ Insertando entrada ANTES de la sección de Tailscale" -ForegroundColor Green
} else {
    # Si no hay Tailscale, agregar al final
    if (-not $hostsContent.EndsWith("`n")) {
        $hostsContent += "`r`n"
    }
    $hostsContent += "$hostEntry`r`n"
    Write-Host "✓ Agregando entrada al final del archivo" -ForegroundColor Green
}

# Guardar el archivo
try {
    Set-Content -Path $hostsPath -Value $hostsContent -NoNewline -Force
    Write-Host "✓ Archivo hosts actualizado correctamente" -ForegroundColor Green
    Write-Host ""
    Write-Host "Ahora puedes acceder a:" -ForegroundColor Cyan
    Write-Host "  • Frontend: http://coordinacion-tescha.local:5173" -ForegroundColor White
    Write-Host "  • Backend:  http://coordinacion-tescha.local:5000" -ForegroundColor White
    Write-Host ""
    Write-Host "Presiona Enter para continuar..." -ForegroundColor Gray
    Read-Host
} catch {
    Write-Host "✗ Error al guardar el archivo hosts" -ForegroundColor Red
    Write-Host "  Asegúrate de ejecutar este script como Administrador" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Presiona Enter para continuar..." -ForegroundColor Gray
    Read-Host
    exit 1
}
