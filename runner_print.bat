@echo off
cd /d "%~dp0"
echo [%date% %time%] Iniciando Guardián de Servidor de Impresión... >> logs_print.log

:loop
if exist node.exe (
    node.exe print-server.js >> logs_print.log 2>&1
) else (
    node print-server.js >> logs_print.log 2>&1
)

if %errorlevel% equ 0 (
    echo [%date% %time%] El Servidor de Impresión ya estaba activo o finalizó normalmente. Deteniendo duplicado. >> logs_print.log
    exit /b 0
)

echo [%date% %time%] El Servidor de Impresión se detuvo unexpectedly. Reiniciando en 3 segundos... >> logs_print.log
timeout /t 3 /nobreak >nul
goto loop
