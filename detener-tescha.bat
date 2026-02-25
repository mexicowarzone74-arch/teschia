@echo off
echo ========================================
echo   DETENIENDO SISTEMA TESCHA
echo ========================================
echo.

echo [1/2] Deteniendo Nginx...
taskkill /F /IM nginx.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Nginx detenido
) else (
    echo Nginx no estaba corriendo
)

echo [2/2] Deteniendo Backend...
cd backend
call pm2 stop tescha-backend

echo.
echo ========================================
echo   SISTEMA DETENIDO
echo ========================================
echo.
pause
