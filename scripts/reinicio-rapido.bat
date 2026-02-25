@echo off
REM ================================================
REM REINICIO RAPIDO - SISTEMA TESCHA
REM ================================================

echo.
echo ========================================
echo   REINICIO RAPIDO DE TESCHA
echo ========================================
echo.

echo [1/3] Deteniendo servicios...
call detener-tescha.bat

echo.
echo [2/3] Esperando 3 segundos...
timeout /t 3 /nobreak > nul

echo.
echo [3/3] Iniciando servicios...
call iniciar-tescha.bat

echo.
echo ========================================
echo   REINICIO COMPLETADO
echo ========================================
echo.
echo Verifica el estado con: pm2 status
echo.

pause
