@echo off
title SERVIDOR DE IMPRESION SUCURSAL 2 - CHIFA MEI HUA
echo Iniciando el servidor de impresion Sucursal 2...
if exist "%~dp0node.exe" (
    "%~dp0node.exe" print-server-sucursal2.js
) else (
    node print-server-sucursal2.js
)
pause
