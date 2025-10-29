@echo off
REM ========================================
REM Codegen Launcher - Small Profile
REM ========================================
REM Denna fil startar Playwright Codegen for small profile
REM Output: playwright/recorded/recorded_small_<timestamp>.ts

echo ========================================
echo Teams Collector - Codegen (Small)
echo ========================================
echo.

REM Ladda environment variables fran .env
call :load_env .env

REM Satt profil-specifika settings
set PLAYWRIGHT_PROFILE=small
set HEADLESS=false

REM Generera timestamp for filnamn (utan aao!)
set TS=%DATE:~-4%-%DATE:~3,2%-%DATE:~0,2%_%TIME:~0,2%-%TIME:~3,2%-%TIME:~6,2%
set TS=%TS: =0%

REM Generera output path
set OUTPUT_FILE=playwright\recorded\recorded_small_%TS%.ts

echo Profile: %PLAYWRIGHT_PROFILE%
echo Viewport: %PROFILE_SMALL_W%x%PROFILE_SMALL_H%
echo Output: %OUTPUT_FILE%
echo.
echo Starting Codegen...
echo TIPS:
echo - Navigera till din Teams chat
echo - Gor de actions du vill spela in
echo - Stang browsern nar du ar klar
echo.

REM Kor codegen
npx playwright codegen ^
    %TEAMS_URL% ^
    --viewport-size=%PROFILE_SMALL_W%,%PROFILE_SMALL_H% ^
    --save-storage=browser_context\state.json ^
    --output=%OUTPUT_FILE%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS!
    echo ========================================
    echo File saved: %OUTPUT_FILE%
    echo.
    echo NEXT STEPS:
    echo 1. Review the recorded script
    echo 2. Convert to production script using AI agent
    echo 3. Test with: scripts\run_scrape_small.bat
    echo ========================================
) else (
    echo.
    echo ========================================
    echo FAILED!
    echo ========================================
    echo Codegen exited with error code: %ERRORLEVEL%
    echo Check that:
    echo - Playwright is installed: npm install
    echo - .env file exists with correct settings
    echo ========================================
)

pause
goto :eof

:load_env
for /f "usebackq tokens=1,2 delims==" %%a in ("%~1") do (
    set "%%a=%%b"
)
goto :eof
