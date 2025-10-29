@echo off
REM ========================================
REM Scraper Runner - Large Profile
REM ========================================

echo ========================================
echo Teams Collector - Scraper (Large)
echo ========================================
echo.

call :load_env .env

set PLAYWRIGHT_PROFILE=large
set HEADLESS=true

echo Profile: %PLAYWRIGHT_PROFILE%
echo Headless: %HEADLESS%
echo.
echo Running scraper...
echo.

node playwright\scripts\fetch_teams_chat_large.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS! Check http://localhost:3040
    echo ========================================
) else (
    echo.
    echo ========================================
    echo FAILED! Error code: %ERRORLEVEL%
    echo ========================================
)

pause
goto :eof

:load_env
for /f "usebackq tokens=1,2 delims==" %%a in ("%~1") do (
    set "%%a=%%b"
)
goto :eof
