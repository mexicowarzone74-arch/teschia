@echo off
REM Script para enviar recordatorios automaticos de pagos
REM Se ejecuta automaticamente a las 9 AM mediante PM2

cd /d "%~dp0.."

echo ========================================
echo    TESCHA - RECORDATORIOS AUTOMATICOS
echo ========================================
echo.

node scripts/enviar_recordatorios_automaticos.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] Recordatorios enviados exitosamente
    exit /b 0
) else (
    echo.
    echo [ERROR] Fallo al enviar recordatorios
    exit /b 1
)
