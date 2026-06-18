@echo off
title MRBS First-time Setup
cd /d "%~dp0"

echo ============================================
echo   MRBS - First-time Setup
echo ============================================
echo.

echo [1/4] Installing backend dependencies...
cd backend
uv sync
if errorlevel 1 goto :error
cd ..

echo.
echo [2/4] Installing frontend dependencies...
bun install
if errorlevel 1 goto :error

echo.
echo [3/4] Setting up database...
call "%~dp0setup-db.bat"
if errorlevel 1 goto :error

echo.
echo [4/4] Done!
echo.
echo Double-click start-dev.bat to run the app.
echo.
pause
exit /b 0

:error
echo.
echo Setup failed.
pause
exit /b 1
