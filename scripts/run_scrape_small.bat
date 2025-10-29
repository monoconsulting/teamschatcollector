@echo off
REM ========================================
REM Scraper Runner - Small Profile
REM ========================================
REM Kor production scraper med small profile

echo ========================================
echo Teams Collector - Scraper (Small)
echo ========================================
echo.

call :load_env .env

set PLAYWRIGHT_PROFILE=small
set HEADLESS=true

echo Profile: %PLAYWRIGHT_PROFILE%
echo Headless: %HEADLESS%
echo.
echo Running scraper...
echo.

node playwright\scripts\fetch_teams_chat_small.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS!
    echo ========================================
    echo Check results:
    echo - Logs: logs\
    echo - Data: data\raw\
    echo - Video: data\video\
    echo - Trace: data\trace\
    echo - Database: query scrape_runs table
    echo - Web UI: http://localhost:3040
    echo ========================================
) else (
    echo.
    echo ========================================
    echo FAILED! Error code: %ERRORLEVEL%
    echo ========================================
    echo Check logs\ for details
    echo.
    echo TROUBLESHOOTING:
    echo - Database running? docker ps
    echo - Correct .env settings?
    echo - Browser issues? Try HEADLESS=false
    echo ========================================
)

pause
goto :eof

:load_env
for /f "usebackq tokens=1,2 delims==" %%a in ("%~1") do (
    set "%%a=%%b"
)
goto :eof
