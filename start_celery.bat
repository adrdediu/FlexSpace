@echo off
echo Starting Celery Worker and Beat Scheduler...
echo.

:: Change to the backend directory (adjust path if needed)
cd /d "%~dp0backend"

:: Start Celery Worker in a new window
start "Celery Worker" cmd /k "call venv\Scripts\activate && celery -A booking_project worker --pool=solo -l info"

:: Small delay before starting beat
timeout /t 2 /nobreak >nul

:: Start Celery Beat in a new window
start "Celery Beat" cmd /k "call venv\Scripts\activate && celery -A booking_project beat -l info"

echo Celery Worker and Beat Scheduler started in separate windows.
pause