@echo off
title MRBS Frontend
cd /d "%~dp0"

echo Starting Fusion Hotel Group MRBS - Frontend...
echo App: http://localhost:5173
echo Login: admin@example.com / changethis
echo.

if not exist "node_modules\" (
  echo Installing dependencies...
  bun install
  echo.
)

bun run dev

if errorlevel 1 (
  echo.
  echo Frontend failed to start. Press any key to close...
  pause >nul
)
