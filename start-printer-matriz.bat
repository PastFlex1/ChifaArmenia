@echo off
title Servidor de Impresion - Matriz
cd /d "%~dp0"
echo ===================================================
echo   INICIANDO SERVIDOR DE IMPRESION MATRIZ
echo ===================================================
node print-server.js
if %errorlevel% neq 0 (
  echo.
  echo [ERROR] Ocurrio un problema al ejecutar el servidor.
  pause
)
