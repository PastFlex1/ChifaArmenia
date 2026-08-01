@echo off
echo ========================================================
echo   Deteniendo Servidor Web y Servidor de Impresion
echo ========================================================
echo.
wmic process where "name='cmd.exe' and (commandline like '%%runner_web%%' or commandline like '%%runner_print%%')" call terminate >nul 2>&1
taskkill /f /im node.exe >nul 2>&1
echo [OK] Todos los procesos del servidor y de impresion han sido detenidos.
echo.
pause
