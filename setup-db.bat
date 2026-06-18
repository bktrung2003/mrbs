@echo off
title MRBS Database Setup
cd /d "%~dp0backend"

echo ============================================
echo   MRBS - Database Setup
echo ============================================
echo.

set PGPASSWORD=postgres

echo [1/3] Creating database (if not exists)...
psql -U postgres -h localhost -tc "SELECT 1 FROM pg_database WHERE datname='app'" | findstr /C:"1" >nul
if errorlevel 1 (
  psql -U postgres -h localhost -c "CREATE DATABASE app;"
) else (
  echo Database 'app' already exists.
)

echo.
echo [2/3] Running migrations...
uv run alembic upgrade head
if errorlevel 1 goto :error

echo.
echo [3/3] Seeding initial data...
uv run python app/initial_data.py
if errorlevel 1 goto :error

echo.
echo ============================================
echo   Setup completed successfully!
echo ============================================
echo.
pause
exit /b 0

:error
echo.
echo Setup failed. Check PostgreSQL is running and .env credentials are correct.
echo.
pause
exit /b 1
