@echo off
title Pet Classifier Startup
echo ==============================================================
echo             Pet Classifier System Bootstrapper
echo ==============================================================
echo.

cd /d "%~dp0"

:: 1. Check Python
echo [1/4] Verifying Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH. Please install Python.
    pause
    exit /b 1
)

:: 2. Setup Virtual Environment
if not exist "venv" (
    echo Creating python virtual environment 'venv'...
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate

echo Upgrading pip...
python -m pip install --upgrade pip

echo Installing backend dependencies (FastAPI, TensorFlow, etc.)...
echo This may take a minute or two...
pip install -r backend/requirements.txt

:: 3. Setup Frontend
echo.
echo [2/4] Verifying Node.js environment...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed. Please install Node.js.
    pause
    exit /b 1
)

echo.
echo [3/4] Checking Next.js dependencies...
cd frontend
if not exist "node_modules" (
    echo No node_modules folder found. Running npm install...
    call npm.cmd install
) else (
    echo node_modules found. Skipping dependency installation.
)
cd ..

:: 4. Run Services
echo.
echo [4/4] Launching Services...
echo.
echo Launching FastAPI backend on http://127.0.0.1:8000 ...
start "FastAPI Backend" cmd /c "call venv\Scripts\activate && uvicorn backend.app:app --host 127.0.0.1 --port 8000"

echo Launching Next.js frontend on http://localhost:3000 ...
cd frontend
start "Next.js Frontend" cmd /c "npm.cmd run dev"

echo.
echo ==============================================================
echo Pet Classifier successfully booted!
echo.
echo Backend URL: http://127.0.0.1:8000
echo Frontend URL: http://localhost:3000
echo.
echo Keep both console windows open. Close them to terminate.
echo ==============================================================
pause
