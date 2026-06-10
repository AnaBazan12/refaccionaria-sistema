@echo off
title Actualizar Sistema
echo.
echo  Actualizando el sistema desde GitHub...
echo.

git pull origin main
if %ERRORLEVEL% neq 0 (
    echo ERROR: No se pudo descargar la actualizacion.
    pause
    exit /b 1
)

echo.
echo  Reconstruyendo frontend...
cd frontend
set VITE_API_URL=/api
call npm install
call npm run build
cd ..

echo.
echo  Aplicando cambios a la base de datos...
cd backend
call npx prisma migrate deploy
cd ..

echo.
echo  Reiniciando el sistema...
pm2 restart taller-sistema

echo.
echo  Sistema actualizado correctamente.
echo  Accede en: http://localhost:4000
echo.
pause
