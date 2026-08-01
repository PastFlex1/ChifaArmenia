@echo off
title Estado de Servidores - Chifa POS
echo ========================================================
echo          ESTADO DE SERVIDORES CHIFA POS
echo ========================================================
echo.
echo [1] PROCESOS NODE EN EJECUCION:
tasklist /FI "IMAGENAME eq node.exe"
echo.
echo [2] VERIFICANDO PUERTO 8080 (WEB POS):
netstat -ano | findstr ":8080"
echo.
echo [3] ULTIMOS LOGS DE IMPRESION DE TICKETS (logs_print.log):
if exist logs_print.log (
    powershell -Command "Get-Content logs_print.log -Tail 10"
) else (
    echo [INFO] No hay archivo logs_print.log aun.
)
echo.
echo [4] ULTIMOS LOGS DEL SERVIDOR WEB (logs_web.log):
if exist logs_web.log (
    powershell -Command "Get-Content logs_web.log -Tail 10"
) else (
    echo [INFO] No hay archivo logs_web.log aun.
)
echo.
echo ========================================================
pause
