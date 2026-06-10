@echo off
title Sistema Taller Mecanico
echo.
echo  Iniciando Sistema de Taller...
echo.

pm2 start ecosystem.config.json 2>nul
pm2 status

echo.
echo  Sistema corriendo en: http://localhost:4000
echo.
echo  Abre el navegador en: http://localhost:4000
echo.
timeout /t 3 >nul
start http://localhost:4000
