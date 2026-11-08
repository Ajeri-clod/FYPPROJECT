@echo off
setlocal
title OKU Jobs Selangor - Share link
REM Double-click to give someone a temporary link to the dashboard running on this PC.
REM The link works while this window (and the dashboard window) stay open and the PC is awake.

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed. Install the LTS version from https://nodejs.org
  goto :end
)
if not exist "node_modules\vite\bin\vite.js" (
  echo [ERROR] Packages are not installed yet. Run start-dashboard.bat once first.
  goto :end
)

REM Cloudflare's tunnel tool, downloaded once into tools\ (no install or admin needed).
set CLOUDFLARED=cloudflared
where cloudflared >nul 2>nul
if errorlevel 1 (
  set CLOUDFLARED=tools\cloudflared.exe
  if not exist "tools\cloudflared.exe" (
    echo Downloading Cloudflare's tunnel tool - first run only, about 60 MB...
    if not exist tools mkdir tools
    curl -L --fail -o tools\cloudflared.exe https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
    if errorlevel 1 (
      echo [ERROR] Download failed. Alternative: winget install --id Cloudflare.cloudflared
      goto :end
    )
  )
)

echo Starting the dashboard in a second window...
start "OKU dashboard (keep open)" cmd /k node node_modules\vite\bin\vite.js dev --port 3000
timeout /t 12 /nobreak >nul

echo.
echo ============================================================================
echo  Look below for a line like:   https://some-random-words.trycloudflare.com
echo  That is the link to send. It can take 10-30 seconds to appear.
echo.
echo  1. Open the link yourself first and click "Dev quick login" - the first
echo     load takes a little while as the app warms up.
echo  2. Send the link to your lecturer. She clicks "Dev quick login" too.
echo  3. To stop sharing: close this window and the dashboard window.
echo     The link changes every time you run this file.
echo ============================================================================
echo.
"%CLOUDFLARED%" tunnel --no-autoupdate --url http://localhost:3000

:end
echo.
pause
