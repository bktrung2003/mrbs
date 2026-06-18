@echo off
title MRBS Backend
cd /d "%~dp0backend"

echo Starting Fusion Hotel Group MRBS - Backend...
echo API: http://localhost:8000
echo Docs: http://localhost:8000/docs
echo.

uv run fastapi dev app/main.py --host 127.0.0.1 --port 8000

if errorlevel 1 (
  echo.
  echo Backend failed to start. Press any key to close...
  pause >nul
)
