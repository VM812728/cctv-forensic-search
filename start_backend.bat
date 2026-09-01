@echo off
title CCTV Candidate Search Backend (FastAPI)
echo ========================================================
echo   CCTV CANDIDATE SEARCH & EVIDENCE STATION BACKEND
echo   Local Biometric Processing Service (FastAPI)
echo ========================================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    echo Please install Python 3.10+ from https://www.python.org/
    pause
    exit /b 1
)

:: Check for virtual environment or install dependencies
if exist "venv\Scripts\activate.bat" (
    echo [INFO] Activating virtual environment...
    call venv\Scripts\activate.bat
) else (
    echo [INFO] Checking Python dependencies...
    python -m pip install -r backend\requirements.txt
)

echo.
echo [INFO] Starting FastAPI Biometric Engine on http://localhost:8000 ...
echo [INFO] Press Ctrl+C to stop the server.
echo.

python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

pause
