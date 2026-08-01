@echo off
title Desinstalador de Inicio Automatico - Chifa POS
echo ========================================================
echo   Desinstalando Inicio Automatico de Chifa POS
echo ========================================================
echo.

set SHORTCUT_PATH=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\ChifaPosServer.lnk

if not exist "%SHORTCUT_PATH%" goto NOT_FOUND

del "%SHORTCUT_PATH%"
echo [OK] El inicio automatico ha sido desinstalado correctamente.
goto END

:NOT_FOUND
echo [INFO] No se encontro ninguna configuracion de inicio automatico activa.

:END
echo.
pause
