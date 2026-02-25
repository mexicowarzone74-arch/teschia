# Script para Configurar Email de Alertas de Seguridad
# Ejecutar desde: backend/

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CONFIGURAR EMAIL DE ALERTAS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Este email SOLO se usará para alertas de seguridad cuando:" -ForegroundColor Yellow
Write-Host "  • Alguien intente hacer SQL Injection" -ForegroundColor Gray
Write-Host "  • Alguien intente hacer XSS" -ForegroundColor Gray
Write-Host "  • Alguien intente fuerza bruta (10+ intentos)" -ForegroundColor Gray
Write-Host "  • Alguien escanee endpoints" -ForegroundColor Gray
Write-Host "  • Alguien intente acceder sin autorización" -ForegroundColor Gray
Write-Host ""

# Obtener email
$email = Read-Host "Email para recibir alertas de seguridad"

Write-Host ""
Write-Host "Para Gmail, necesitas una 'Contraseña de aplicación':" -ForegroundColor Yellow
Write-Host "1. Ve a: https://myaccount.google.com/apppasswords" -ForegroundColor Cyan
Write-Host "2. Inicia sesión" -ForegroundColor Cyan
Write-Host "3. Selecciona 'Correo' y 'Otro (TESCHA Security)'" -ForegroundColor Cyan
Write-Host "4. Copia la contraseña de 16 caracteres" -ForegroundColor Cyan
Write-Host ""

$smtpUser = Read-Host "Email SMTP (normalmente el mismo: $email)"
if ([string]::IsNullOrWhiteSpace($smtpUser)) {
    $smtpUser = $email
}

$smtpPass = Read-Host "Contraseña de aplicación (16 caracteres)"

Write-Host ""
Write-Host "Generando clave de encriptación..." -ForegroundColor Yellow
$encryptionKey = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Crear contenido para agregar al .env
$envConfig = @"

# ========================================
# 🔒 CONFIGURACIÓN DE SEGURIDAD
# ========================================

# Email para alertas de seguridad (SOLO cuando hay intentos de hackeo)
SECURITY_ALERT_EMAIL=$email

# Habilitar alertas por email
ENABLE_EMAIL_ALERTS=true

# Configuración SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=$smtpUser
SMTP_PASS=$smtpPass

# Clave de encriptación para datos sensibles
ENCRYPTION_KEY=$encryptionKey
"@

# Verificar si ya existe configuración de seguridad
$envPath = ".env"
$envContent = Get-Content $envPath -Raw -ErrorAction SilentlyContinue

if ($envContent -match "SECURITY_ALERT_EMAIL") {
    Write-Host "⚠️  Ya existe configuración de seguridad en .env" -ForegroundColor Yellow
    $sobrescribir = Read-Host "¿Deseas sobrescribirla? (s/n)"
    
    if ($sobrescribir -eq "s" -or $sobrescribir -eq "S") {
        # Eliminar configuración anterior
        $envContent = $envContent -replace "(?s)# ========================================\s*# 🔒 CONFIGURACIÓN DE SEGURIDAD.*?ENCRYPTION_KEY=.*", ""
        $envContent | Set-Content $envPath -NoNewline
        Add-Content $envPath $envConfig
        Write-Host "✅ Configuración actualizada" -ForegroundColor Green
    } else {
        Write-Host "⏭️  Configuración no modificada" -ForegroundColor Yellow
        exit 0
    }
} else {
    # Agregar al final
    Add-Content $envPath $envConfig
    Write-Host "✅ Configuración agregada a .env" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ CONFIGURACIÓN COMPLETADA" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📧 Email configurado: $email" -ForegroundColor Cyan
Write-Host "🔐 Encryption Key generada" -ForegroundColor Cyan
Write-Host ""

Write-Host "🧪 PROBAR ALERTAS:" -ForegroundColor Yellow
Write-Host "1. Inicia el servidor: npm run dev" -ForegroundColor White
Write-Host "2. Simula un ataque de fuerza bruta:" -ForegroundColor White
Write-Host ""
Write-Host "   for (`$i=1; `$i -le 10; `$i++) {" -ForegroundColor Gray
Write-Host "     curl -X POST http://localhost:5000/api/auth/login ``" -ForegroundColor Gray
Write-Host "       -H 'Content-Type: application/json' ``" -ForegroundColor Gray
Write-Host "       -d '{\"username\":\"admin\",\"password\":\"wrong\"}'" -ForegroundColor Gray
Write-Host "   }" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Deberías recibir un email de alerta" -ForegroundColor White
Write-Host ""

Write-Host "🎉 ¡Listo! El sistema enviará emails SOLO cuando detecte intentos de hackeo" -ForegroundColor Green
Write-Host ""
