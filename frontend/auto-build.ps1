# Script para auto-build en producción cuando hay cambios
Write-Host "🔄 Observando cambios en src/..." -ForegroundColor Cyan
Write-Host "   Presiona Ctrl+C para detener" -ForegroundColor Yellow
Write-Host ""

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = "$PSScriptRoot\src"
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true

$changeAction = {
    $path = $Event.SourceEventArgs.FullPath
    $changeType = $Event.SourceEventArgs.ChangeType
    
    # Filtrar solo archivos .jsx, .js, .css
    if ($path -match '\.(jsx?|css)$') {
        Write-Host "📝 Detectado cambio: $($path | Split-Path -Leaf)" -ForegroundColor Green
        Write-Host "🔨 Construyendo..." -ForegroundColor Yellow
        
        # Ejecutar build
        npm run build 2>&1 | Out-Null
        
        Write-Host "✅ Build completado - $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Green
        Write-Host ""
    }
}

# Registrar eventos
Register-ObjectEvent $watcher "Changed" -Action $changeAction | Out-Null
Register-ObjectEvent $watcher "Created" -Action $changeAction | Out-Null

Write-Host "✅ Listo. Esperando cambios..." -ForegroundColor Green
Write-Host ""

# Mantener el script ejecutándose
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    # Limpiar al salir
    $watcher.Dispose()
    Get-EventSubscriber | Unregister-Event
}
