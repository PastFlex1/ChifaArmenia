@echo off
title ACTIVADOR DE ARRANQUE AUTOMATICO
echo Creando acceso directo en la carpeta de Inicio de Windows...

set "SCRIPT_PATH=%~dp0iniciar_impresion_oculta.vbs"
set "WORKING_DIR=%~dp0"
set "SHORTCUT_PATH=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\ServidorImpresionChifa.lnk"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut($env:SHORTCUT_PATH); $s.TargetPath = $env:SCRIPT_PATH; $s.WorkingDirectory = $env:WORKING_DIR; $s.Save()"

echo.
echo LISTO! El servidor de impresion ahora se iniciara automaticamente
echo de forma silenciosa cada vez que enciendas la computadora.
echo.
pause
