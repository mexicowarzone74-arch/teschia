# INSTALADOR DE OLLAMA - RESPALDO SIN INTERNET
# Para PC con 4GB RAM

Write-Host "`n🤖 INSTALADOR DE RESPALDO IA SIN INTERNET`n" -ForegroundColor Cyan
Write-Host "Este script instalará Ollama con un modelo ligero" -ForegroundColor Yellow
Write-Host "perfecto para PC con 4GB de RAM`n" -ForegroundColor Yellow

# Verificar si ya está instalado
$ollamaCmd = Get-Command ollama -ErrorAction SilentlyContinue

if ($ollamaCmd) {
    Write-Host "✅ Ollama ya está instalado`n" -ForegroundColor Green
}
else {
    Write-Host "📥 Descargando Ollama..." -ForegroundColor Cyan
    Write-Host "Abriendo página de descarga en tu navegador...`n"
    
    Start-Process "https://ollama.ai/download"
    
    Write-Host "⚠️  INSTRUCCIONES:" -ForegroundColor Yellow
    Write-Host "1. Descarga OllamaSetup.exe desde la página" -ForegroundColor White
    Write-Host "2. Ejecuta el instalador" -ForegroundColor White
    Write-Host "3. Vuelve a ejecutar este script cuando termine`n" -ForegroundColor White
    
    Read-Host "Presiona ENTER cuando hayas instalado Ollama"
    
    # Verificar nuevamente
    $ollamaCmd = Get-Command ollama -ErrorAction SilentlyContinue
    if (-not $ollamaCmd) {
        Write-Host "❌ Ollama no se detectó. Instálalo y vuelve a intentar" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n✅ Ollama detectado. Continuando...`n" -ForegroundColor Green

# INSTALAR MODELO LIGERO
Write-Host "📦 MODELOS PARA 4GB RAM:`n" -ForegroundColor Cyan
Write-Host "1. phi3:mini   (2GB) - Recomendado" -ForegroundColor Green
Write-Host "2. tinyllama   (637MB) - Muy básico" -ForegroundColor Yellow
Write-Host "3. gemma:2b    (1.4GB) - Buena calidad`n" -ForegroundColor Green

$opcion = Read-Host "Elige (1, 2 o 3) [1]"
if ([string]::IsNullOrWhiteSpace($opcion)) { $opcion = "1" }

$modelo = switch ($opcion) {
    "2" { "tinyllama" }
    "3" { "gemma:2b" }
    default { "phi3:mini" }
}

Write-Host "`n📥 Instalando: $modelo..." -ForegroundColor Cyan
Write-Host "Esto puede tardar varios minutos`n" -ForegroundColor Yellow

ollama pull $modelo

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Modelo instalado!`n" -ForegroundColor Green
    
    # Actualizar .env
    $envPath = ".\backend\.env"
    if (Test-Path $envPath) {
        $contenido = Get-Content $envPath -Raw
        $contenido = $contenido -replace "OLLAMA_MODEL=.*", "OLLAMA_MODEL=$modelo"
        $contenido = $contenido -replace "OLLAMA_URL=.*", "OLLAMA_URL=http://127.0.0.1:11434/v1/chat/completions"
        Set-Content $envPath -Value $contenido -NoNewline
        Write-Host "✅ Configuración actualizada`n" -ForegroundColor Green
    }
    
    Write-Host "🎉 INSTALACIÓN COMPLETADA`n" -ForegroundColor Green
    Write-Host "CON INTERNET → Groq (rápido)" -ForegroundColor White
    Write-Host "SIN INTERNET → Ollama (respaldo)`n" -ForegroundColor White
}
else {
    Write-Host "`n❌ Error al instalar" -ForegroundColor Red
}

Read-Host "`nPresiona ENTER para salir"
