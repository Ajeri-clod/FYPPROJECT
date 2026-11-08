@echo off
setlocal
title OKU Jobs Selangor - Load scraped jobs
REM Loads the last scrape (scraper\output\jobs.csv) into the dashboard
REM without scraping again. Restart the dashboard afterwards.

cd /d "%~dp0"

if not exist "scraper\output\jobs.csv" (
  echo [ERROR] scraper\output\jobs.csv not found - run scrape-jobs.bat first.
  goto :end
)

set BUN=%USERPROFILE%\.bun\bin\bun.exe
if not exist "%BUN%" set BUN=bun
"%BUN%" scripts\import-jobs.ts scraper\output\jobs.csv
if errorlevel 1 (
  echo [ERROR] Import failed - scroll up for the message.
  goto :end
)

echo.
echo Done. Close the dashboard window if it is open, then start it again
echo (start-dashboard.bat or share-dashboard.bat) to see the real job postings.

:end
echo.
pause
