@echo off
title Servidor de Impresion - Sucursal 2
cd /d "%~dp0"
echo ===================================================
echo   INICIANDO SERVIDOR DE IMPRESION SUCURSAL 2
echo ===================================================
node print-server-sucursal2.js
if %errorlevel% neq 0 (
  echo.
  echo [ERROR] Ocurrio un problema al ejecutar el servidor.
  pause
)
