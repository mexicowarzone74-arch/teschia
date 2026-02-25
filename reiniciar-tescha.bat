@echo off
echo ========================================
echo   REINICIANDO SISTEMA TESCHA
echo ========================================
echo.

echo [1/2] Reiniciando Nginx...
taskkill /F /IM nginx.exe >nul 2>&1
cd C:\nginx
start /MIN nginx.exe
timeout /t 2 /nobreak >nul

cd %~dp0backend
echo [2/2] Reiniciando Backend...
call pm2 restart tescha-backend

echo.
echo ========================================
echo   SISTEMA REINICIADO
echo ========================================
echo.
echo Accede a: http://coordinacion-tescha.local
echo.
pause
