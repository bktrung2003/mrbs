@echo off
title MRBS Dev Launcher
cd /d "%~dp0"

echo ============================================
echo   Fusion Hotel Group MRBS - Dev Launcher
echo ============================================
echo.
echo Opening Backend  (http://localhost:8000)
echo Opening Frontend (http://localhost:5173)
echo.
echo Close each window to stop that service.
echo ============================================
echo.

start "MRBS Backend" cmd /k "%~dp0start-backend.bat"
timeout /t 2 /nobreak >nul
start "MRBS Frontend" cmd /k "%~dp0start-frontend.bat"

echo Both servers are starting in separate windows.
timeout /t 3 /nobreak >nul
