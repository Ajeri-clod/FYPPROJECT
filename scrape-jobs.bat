@echo off
setlocal
title OKU Jobs Selangor - Job scraper
REM Double-click to scrape Selangor job postings and load them into the dashboard.
REM First run installs Python packages into scraper\.venv (a few minutes).

cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Python is not installed.
  echo Install it with:  winget install Python.Python.3.12
  echo or from https://www.python.org/downloads/ ^(tick "Add python.exe to PATH"^),
  echo then run this file again.
  goto :end
)

if not exist "scraper\.venv\Scripts\python.exe" (
  echo Setting up the scraper - first run only...
  python -m venv scraper\.venv || goto :fail
  scraper\.venv\Scripts\python.exe -m pip install --upgrade pip >nul
  scraper\.venv\Scripts\python.exe -m pip install -r scraper\requirements.txt || goto :fail
)


set MAXJOBS=100
set /p MAXJOBS="How many Selangor jobs per site? (Enter = 100): "

echo.
echo [1/3] Scraping Hiredly from its job sitemap (3 seconds per page, about 10 minutes for 100 jobs)...
scraper\.venv\Scripts\python.exe scraper\scrape_jobs.py --site hiredly --max-jobs %MAXJOBS% --out scraper\output\hiredly.csv
echo.
echo [2/3] Scraping Maukerja...
scraper\.venv\Scripts\python.exe scraper\scrape_jobs.py --site maukerja --max-jobs %MAXJOBS% --out scraper\output\maukerja.csv

echo.
echo [3/3] Combining and loading into the dashboard...
scraper\.venv\Scripts\python.exe scraper\combine.py scraper\output\jobs.csv scraper\output\hiredly.csv scraper\output\maukerja.csv || goto :fail

set BUN=%USERPROFILE%\.bun\bin\bun.exe
if not exist "%BUN%" set BUN=bun
"%BUN%" scripts\import-jobs.ts scraper\output\jobs.csv || goto :fail

echo.
echo Done. Open scraper\output\jobs.csv in Excel to review the data,
echo then restart the dashboard (start-dashboard.bat) to see the jobs.
goto :end

:fail
echo.
echo [ERROR] Something failed - scroll up for the message.

:end
echo.
pause
