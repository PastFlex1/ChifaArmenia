@echo off
title SERVIDOR DE IMPRESION MATRIZ - CHIFA MEI HUA
echo Iniciando el servidor de impresion Matriz...
if exist "%~dp0node.exe" (
    "%~dp0node.exe" print-server.js
) else (
    node print-server.js
)
pause
