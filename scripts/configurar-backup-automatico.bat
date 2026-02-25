@echo off
REM ================================================
REM CONFIGURAR BACKUP AUTOMATICO - SISTEMA TESCHA
REM Requiere permisos de administrador
REM ================================================

echo.
echo ========================================
echo   CONFIGURAR BACKUP AUTOMATICO
echo ========================================
echo.
echo Este script requiere permisos de ADMINISTRADOR
echo.
echo Si ves un mensaje de UAC, haz clic en "Si"
echo.
pause

REM Ejecutar PowerShell como administrador
powershell -Command "Start-Process PowerShell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \"%~dp0configurar-backup-automatico.ps1\"' -Verb RunAs"
