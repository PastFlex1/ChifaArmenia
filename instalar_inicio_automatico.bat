@echo off
title Instalador de Inicio Automatico - Servidor de Impresion Chifa POS
echo =================================================================
echo   Configurando Inicio Automatico (Servidor de Impresion Tickets)
echo =================================================================
echo.

set TARGET_SCRIPT=%~dp0iniciar_servidor_oculto.vbs
set WORKING_DIR=%~dp0
set SHORTCUT_PATH=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\ChifaPrinterServer.lnk

echo Creando acceso directo en la carpeta de Inicio de Windows...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut($env:SHORTCUT_PATH); $s.TargetPath = $env:TARGET_SCRIPT; $s.WorkingDirectory = $env:WORKING_DIR; $s.Save()"

if not exist "%SHORTCUT_PATH%" goto ERROR

echo.
echo [EXITO] ¡Servidor de Impresion configurado con exito!
echo Cada vez que enciendas o reinicies la computadora:
echo - El Servidor de Impresion de Tickets iniciara automaticamente en segundo plano.
echo - Escuchara los pedidos de la nube e imprimira los tickets al instante.
goto END

:ERROR
echo.
echo [ERROR] No se pudo crear el acceso directo de inicio automatico.

:END
echo.
pause
