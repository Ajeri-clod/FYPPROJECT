@echo off
setlocal EnableDelayedExpansion
title OKU Jobs Selangor - Share link (keep open)
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
if not exist tools mkdir tools
set CLOUDFLARED=cloudflared
where cloudflared >nul 2>nul
if errorlevel 1 (
  set CLOUDFLARED=tools\cloudflared.exe
  if not exist "tools\cloudflared.exe" (
    echo Downloading Cloudflare's tunnel tool - first run only, about 60 MB...
    curl -L --fail --retry 4 --retry-delay 5 --retry-all-errors -o tools\cloudflared.exe https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
    if errorlevel 1 (
      if exist tools\cloudflared.exe del tools\cloudflared.exe
      echo.
      echo [ERROR] Download failed ^(GitHub may be busy^). Either run this file again later, or:
      echo   - open https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
      echo     in your browser, rename the file to cloudflared.exe and put it in the tools folder, or
      echo   - run:  winget install --id Cloudflare.cloudflared   then reopen this file.
      goto :end
    )
  )
)

REM Is a dashboard already running? Reuse it rather than starting a second one.
call :probe
if "!CODE!"=="200" (
  echo The dashboard is already running - using it.
) else (
  echo Starting the dashboard in a second window ^(it will say 127.0.0.1 - that is normal^)...
  REM 127.0.0.1, not localhost: on Windows "localhost" can mean IPv6 ::1, which
  REM the tunnel does not reach ^(Cloudflare then shows "Bad gateway 502"^).
  start "OKU dashboard (keep open)" cmd /k node node_modules\vite\bin\vite.js dev --host 127.0.0.1 --port 3000 --strictPort
  echo Waiting for the dashboard to answer - up to 2 minutes...
  for /l %%i in (1,1,120) do (
    if not "!CODE!"=="200" (
      timeout /t 1 /nobreak >nul
      call :probe
    )
  )
)
if not "!CODE!"=="200" (
  echo.
  echo [ERROR] The dashboard did not start on port 3000. Look at the dashboard window:
  echo   - "Port 3000 is already in use": close every other dashboard / Command Prompt
  echo     window ^(or restart the PC^), then run this file again.
  echo   - any other red error: send me what it says.
  goto :end
)
echo Dashboard is up.

echo Opening the public link - this takes 10-30 seconds...
if exist tools\tunnel.log del tools\tunnel.log
start "" /b "%CLOUDFLARED%" tunnel --no-autoupdate --url http://127.0.0.1:3000 --logfile tools\tunnel.log >nul 2>&1

set URL=
for /l %%i in (1,1,60) do (
  if not defined URL (
    timeout /t 1 /nobreak >nul
    for /f "usebackq delims=" %%U in (`powershell -NoProfile -Command "if (Test-Path 'tools\tunnel.log') { (Select-String -Path 'tools\tunnel.log' -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | Select-Object -First 1).Matches.Value }"`) do set URL=%%U
  )
)

if not defined URL (
  echo.
  echo [ERROR] No public link after 60 seconds. Last lines of the tunnel log:
  echo ----------------------------------------------------------------------
  powershell -NoProfile -Command "if (Test-Path 'tools\tunnel.log') { Get-Content 'tools\tunnel.log' -Tail 15 } else { 'No log - cloudflared did not start.' }"
  echo ----------------------------------------------------------------------
  echo Common causes: a campus/office network or antivirus blocking Cloudflare.
  echo Try again on home Wi-Fi or a phone hotspot, and send me the lines above.
  goto :end
)

echo !URL!| clip
echo.
echo ============================================================================
echo.
echo     YOUR SHARE LINK:   !URL!
echo.
echo     (already copied - just paste it into WhatsApp / email)
echo ============================================================================
echo.
echo  1. It is opening in your browser now - click "Dev quick login" to check it.
echo     The first load can take up to a minute while the app warms up.
echo  2. Send the link to your lecturer. She clicks "Dev quick login" too.
echo  3. Keep BOTH windows open and the PC awake while she is viewing.
echo     To stop sharing, close both windows. The link changes every run.
echo.
start "" "!URL!"

:end
echo.
echo Press any key to STOP sharing and close this window...
pause >nul
taskkill /im cloudflared.exe /f >nul 2>&1
exit /b

:probe
REM Sets CODE to the HTTP status of the dashboard's login page ("000" = not running).
set CODE=000
for /f %%c in ('curl -s -o nul -m 5 -w "%%{http_code}" http://127.0.0.1:3000/login 2^>nul') do set CODE=%%c
exit /b
