@echo off
REM ========================================
REM Docker Logs Viewer
REM ========================================

echo ========================================
echo Teams Collector - Container Logs
echo ========================================
echo.
echo Press Ctrl+C to exit
echo.

docker-compose logs -f --tail=100
