@echo off
title CodonDocuManger - Visual Guide Maker
color 0A

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║   CodonDocuManger - Visual Guide Maker   ║
echo  ║   Auto-generate step-by-step guides      ║
echo  ╚══════════════════════════════════════════╝
echo.

REM Check if virtual environment exists
if not exist "%~dp0app\.venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment not found.
    echo Run setup first: cd app ^& py -m venv .venv ^& .venv\Scripts\pip install -r requirements.txt
    pause
    exit /b 1
)

echo [1/2] Building frontend...
cd /d "%~dp0app\frontend"
call npm run build >nul 2>&1

echo [2/2] Starting CodonDocuManger server...
echo.
echo  Access the app at: http://localhost:8765
echo  Press F9 to stop recording from anywhere on your screen.
echo  Close this window to shut down CodonDocuManger.
echo.

cd /d "%~dp0app\backend"
"%~dp0app\.venv\Scripts\python.exe" main.py

pause
