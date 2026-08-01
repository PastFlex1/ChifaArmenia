@echo off
echo ========================================================
echo   Deteniendo Servidor de Impresion de Tickets
echo ========================================================
echo.
wmic process where "name='cmd.exe' and commandline like '%%runner_print%%'" call terminate >nul 2>&1
wmic process where "name='node.exe' and commandline like '%%print-server.js%%'" call terminate >nul 2>&1
echo [OK] El servidor de impresion de tickets ha sido detenido correctamente.
echo.
pause
