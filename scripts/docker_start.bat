@echo off
REM ========================================
REM Docker Compose Start
REM ========================================
REM Startar alla containers (db, api, scraper)

echo ========================================
echo Teams Collector - Starting Docker Stack
echo ========================================
echo.

echo Checking docker-compose.yml...
if not exist "docker-compose.yml" (
    echo ERROR: docker-compose.yml not found!
    echo Run this from project root.
    pause
    exit /b 1
)

echo.
echo Starting containers...
echo This may take a few minutes on first run...
echo.

docker-compose up -d

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS! All containers started
    echo ========================================
    echo.
    echo Services:
    echo - Database: localhost:3306
    echo - Web API: http://localhost:3040
    echo - Scraper: background service
    echo.
    echo Check status: docker ps
    echo Check logs: docker-compose logs -f
    echo ========================================
) else (
    echo.
    echo ========================================
    echo FAILED! Error code: %ERRORLEVEL%
    echo ========================================
    echo.
    echo TROUBLESHOOTING:
    echo - Docker Desktop running?
    echo - Ports 3040, 3306 available?
    echo   (NEVER use taskkill! Check docker ps first)
    echo - .env file configured?
    echo ========================================
)

pause
