@echo off
title Respaldo de Base de Datos
echo.
echo  Creando respaldo de la base de datos...
echo.

set FECHA=%date:~6,4%-%date:~3,2%-%date:~0,2%
set ARCHIVO=backup_%FECHA%.sql

if not exist "backups" mkdir backups

pg_dump -U postgres -d refaccionaria -f "backups\%ARCHIVO%"

if %ERRORLEVEL% == 0 (
    echo.
    echo  Respaldo guardado en: backups\%ARCHIVO%
    echo.
) else (
    echo.
    echo  ERROR: No se pudo crear el respaldo.
    echo  Verifica que PostgreSQL este corriendo.
    echo.
)

pause
