@echo off
echo ========================================
echo   INICIANDO SISTEMA TESCHA
echo ========================================
echo.

echo [1/3] Iniciando Nginx (Proxy)...
cd C:\nginx
start /MIN nginx.exe
timeout /t 2 /nobreak >nul

cd %~dp0backend
echo [2/3] Iniciando Backend...
call pm2 start ecosystem.config.cjs
timeout /t 3 /nobreak >nul

echo.
echo [3/3] Iniciando Frontend...
cd ..\frontend
start npm run dev

echo.
echo ========================================
echo   SISTEMA INICIADO CORRECTAMENTE
echo ========================================
echo.
echo ACCESO PRINCIPAL (via Nginx):
echo   - http://coordinacion-tescha.local
for /f "usebackq tokens=*" %%i in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback|Virtual|Pseudo|vEthernet' } | Select-Object -First 1).IPAddress"`) do set LOCAL_IP=%%i
echo   - http://%LOCAL_IP%
echo   - http://localhost
echo.
echo ACCESO DIRECTO (con puerto):
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:3000
echo.
pause
