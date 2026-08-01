@echo off
title DETENER SERVIDOR DE IMPRESION
echo Deteniendo el servidor de impresion en segundo plano...
taskkill /F /IM node.exe
echo.
echo Listo! El servidor de impresion ha sido detenido.
pause
