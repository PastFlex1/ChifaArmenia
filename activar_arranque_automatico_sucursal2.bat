@echo off
title ACTIVADOR DE ARRANQUE AUTOMATICO - SUCURSAL 2
echo Creando acceso directo en la carpeta de Inicio de Windows para Sucursal 2...

set "SCRIPT_PATH=%~dp0iniciar_impresion_oculta_sucursal2.vbs"
set "WORKING_DIR=%~dp0"
set "SHORTCUT_PATH=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\ServidorImpresionChifaSucursal2.lnk"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut($env:SHORTCUT_PATH); $s.TargetPath = $env:SCRIPT_PATH; $s.WorkingDirectory = $env:WORKING_DIR; $s.Save()"

echo.
echo LISTO! El servidor de impresion de la SUCURSAL 2 ahora se iniciara automaticamente
echo de forma silenciosa cada vez que enciendas la computadora.
echo.
pause
