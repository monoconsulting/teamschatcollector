@echo off
REM ================================================================
REM Teams Collector - Quick Codegen Launcher (Large Profile)
REM ================================================================
REM Snabbstart for att spela in Teams-navigering med large profile
REM Denna fil ligger i projektets rot for enkel access
REM
REM Anvandning: Dubbelklicka eller kor fran kommandotolken
REM Output: playwright/recorded/recorded_large_<timestamp>.ts
REM ================================================================

echo.
echo ================================================================
echo   TEAMS COLLECTOR - CODEGEN LAUNCHER
echo   Profile: LARGE (1920x1080)
echo ================================================================
echo.
echo Detta verktyg hjalper dig att spela in din Teams-navigering
echo automatiskt. En weblasare kommer att oppnas dar du kan:
echo.
echo   1. Logga in pa Teams (om inte redan inloggad)
echo   2. Navigera till den chat du vill samla in fran
echo   3. Scrolla lite i historiken
echo   4. Stang weblasaren nar du ar klar
echo.
echo Din session kommer att sparas och kan konverteras till
echo ett produktionsskript for automatisk chattinsamling.
echo.
echo ================================================================
echo.

pause

REM Anropa den riktiga scriptet i scripts-mappen
call scripts\run_codegen_large.bat
