@echo off
REM ========================================
REM Docker Compose Stop
REM ========================================

echo ========================================
echo Teams Collector - Stopping Docker Stack
echo ========================================
echo.

docker-compose down

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS! All containers stopped
    echo ========================================
) else (
    echo.
    echo ========================================
    echo FAILED! Error code: %ERRORLEVEL%
    echo ========================================
)

pause
