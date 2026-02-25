@echo off
REM ================================================
REM SCRIPT DE BACKUP - SISTEMA TESCHA
REM ================================================

echo.
echo ========================================
echo   BACKUP AUTOMATICO DE TESCHA
echo ========================================
echo.

REM Crear carpeta de backups si no existe
if not exist "backups" mkdir backups

REM Obtener fecha en formato YYYYMMDD
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set FECHA=%datetime:~0,8%
set HORA=%datetime:~8,4%

REM Nombre del archivo
set ARCHIVO=backups\tescha_backup_%FECHA%_%HORA%.sql

echo [1/3] Creando backup de la base de datos...
echo.

REM Ejecutar pg_dump (asegúrate de tener PostgreSQL en PATH)
pg_dump -U postgres -d tescha_db > "%ARCHIVO%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [2/3] Backup completado exitosamente!
    echo       Archivo: %ARCHIVO%
    
    REM Obtener tamaño del archivo
    for %%A in ("%ARCHIVO%") do set TAMANO=%%~zA
    echo       Tamaño: %TAMANO% bytes
    
    echo.
    echo [3/3] Limpiando backups antiguos (mas de 30 dias)...
    
    REM Eliminar backups mas antiguos de 30 dias
    forfiles /P "backups" /M *.sql /D -30 /C "cmd /c del @path" 2>nul
    
    echo.
    echo ========================================
    echo   BACKUP COMPLETADO EXITOSAMENTE
    echo ========================================
    echo.
) else (
    echo.
    echo ========================================
    echo   ERROR EN EL BACKUP
    echo ========================================
    echo.
    echo Verifica que:
    echo 1. PostgreSQL este instalado
    echo 2. La base de datos 'tescha_db' exista
    echo 3. El usuario 'postgres' tenga permisos
    echo.
)

pause
