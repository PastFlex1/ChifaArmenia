@echo off
title SERVIDOR DE IMPRESION MATRIZ - CHIFA MEI HUA
cd /d "%~dp0"

if not exist "%~dp0node_modules\firebase" (
    echo ========================================================
    echo   Instalando dependencias de Firebase por primera vez...
    echo ========================================================
    call npm install
)

echo.
echo Iniciando el servidor de impresion Matriz...
if exist "%~dp0node.exe" (
    "%~dp0node.exe" print-server.js
) else (
    node print-server.js
)
pause
