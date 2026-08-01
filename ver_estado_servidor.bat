@echo off
title Estado de Servidor de Impresion - Chifa POS
echo ========================================================
echo   ESTADO DEL SERVIDOR DE IMPRESION DE TICKETS (CHIFA POS)
echo ========================================================
echo.
echo [1] PROCESO DE IMPRESION EN EJECUCION:
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process -Filter \"name='node.exe'\" | Where-Object { $_.CommandLine -like '*print-server.js*' } | Select-Object ProcessId, CommandLine"
echo.
echo [2] ULTIMOS LOGS DE IMPRESION DE TICKETS (logs_print.log):
if exist logs_print.log (
    powershell -Command "Get-Content logs_print.log -Tail 15"
) else (
    echo [INFO] No hay archivo logs_print.log aun.
)
echo.
echo ========================================================
pause
