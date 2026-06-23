@echo off
echo ========================================================
echo        Deteniendo el servidor de Chifa (en segundo plano)
echo ========================================================
wmic process where "name='node.exe' and commandline like '%%server.js%%'" call terminate
echo.
echo El servidor se ha detenido correctamente.
pause
