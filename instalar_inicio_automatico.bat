@echo off
title Instalador de Inicio Automatico - Chifa POS
echo ========================================================
echo   Configurando Inicio Automatico en Windows (Chifa POS)
echo ========================================================
echo.

set TARGET_SCRIPT=%~dp0iniciar_servidor_oculto.vbs
set WORKING_DIR=%~dp0
set SHORTCUT_PATH=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\ChifaPosServer.lnk

echo Creando acceso directo en la carpeta de Inicio de Windows...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut($env:SHORTCUT_PATH); $s.TargetPath = $env:TARGET_SCRIPT; $s.WorkingDirectory = $env:WORKING_DIR; $s.Save()"

if not exist "%SHORTCUT_PATH%" goto ERROR

echo.
echo [EXITO] Configurado inicio automatico con exito.
echo Cada vez que enciendas o reinicies la computadora:
echo 1. El Servidor Web (Sistema POS) se iniciara automaticamente.
echo 2. El Servidor de Impresion de Tickets se iniciara automaticamente.
echo 3. Ambos funcionaran en segundo plano y se autoreiniciaran si fallan.
goto END

:ERROR
echo.
echo [ERROR] No se pudo crear el acceso directo de inicio automatico.

:END
echo.
pause
