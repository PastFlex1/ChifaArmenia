@echo off
cd /d "%~dp0"
echo [%date% %time%] Iniciando Guardián de Servidor Web... >> logs_web.log

:loop
if exist node.exe (
    node.exe server.js >> logs_web.log 2>&1
) else (
    node server.js >> logs_web.log 2>&1
)

if %errorlevel% equ 0 (
    echo [%date% %time%] El Servidor Web ya estaba activo o finalizó normalmente. Deteniendo duplicado. >> logs_web.log
    exit /b 0
)

echo [%date% %time%] El Servidor Web se detuvo unexpectedly. Reiniciando en 3 segundos... >> logs_web.log
timeout /t 3 /nobreak >nul
goto loop
