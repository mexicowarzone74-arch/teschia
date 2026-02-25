@echo off
REM Script de instalación de sistema anti-pendejos - TESCHA
REM Ejecuta el script de PowerShell

echo.
echo ===============================================================
echo   INSTALADOR DE SISTEMA ANTI-PENDEJOS - TESCHA
echo ===============================================================
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0instalar-seguridad-avanzada.ps1"

pause
