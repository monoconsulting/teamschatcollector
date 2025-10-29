@echo off
REM ========================================
REM Codegen Launcher - Large Profile
REM ========================================

echo ========================================
echo Teams Collector - Codegen (Large)
echo ========================================
echo.

call :load_env .env

set PLAYWRIGHT_PROFILE=large
set HEADLESS=false

set TS=%DATE:~-4%-%DATE:~3,2%-%DATE:~0,2%_%TIME:~0,2%-%TIME:~3,2%-%TIME:~6,2%
set TS=%TS: =0%

set OUTPUT_FILE=playwright\recorded\recorded_large_%TS%.ts

echo Profile: %PLAYWRIGHT_PROFILE%
echo Viewport: %PROFILE_LARGE_W%x%PROFILE_LARGE_H%
echo Output: %OUTPUT_FILE%
echo.
echo Starting Codegen...
echo.

npx playwright codegen ^
    %TEAMS_URL% ^
    --viewport-size=%PROFILE_LARGE_W%,%PROFILE_LARGE_H% ^
    --save-storage=browser_context\state.json ^
    --output=%OUTPUT_FILE%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS! File saved: %OUTPUT_FILE%
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
