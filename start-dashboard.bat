@echo off
setlocal
title OKU Jobs Selangor - Dashboard
REM Double-click to start the OKU dashboard. Keep this window open while you use it.

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed.
  echo Install the LTS version from https://nodejs.org then run this file again.
  goto :end
)

if not exist "node_modules\vite\bin\vite.js" (
  echo Installing packages - first run only, this takes a few minutes...
  if exist "%USERPROFILE%\.bun\bin\bun.exe" (
    "%USERPROFILE%\.bun\bin\bun.exe" install
  ) else (
    call npm install
  )
  if not exist "node_modules\vite\bin\vite.js" (
    echo.
    echo [ERROR] Package install failed. Scroll up for the error message.
    goto :end
  )
)

echo.
echo Starting the dashboard...
echo Your browser will open http://localhost:3000 - click "Dev quick login".
echo To stop the dashboard, close this window or press Ctrl+C.
echo.

REM Open the browser once the server has had a few seconds to start.
start "" /b cmd /c "timeout /t 6 /nobreak >nul & start http://localhost:3000"

node node_modules\vite\bin\vite.js dev --port 3000

:end
echo.
pause
