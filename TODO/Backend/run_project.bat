@echo off
title Insurance Intelligence Platform
echo ======================================================================
echo Insurance Intelligence: Life Insurance New Business Forecasting Platform
echo ======================================================================
echo.

echo [1/3] Checking Python virtual environment...
if not exist ".venv\Scripts\python.exe" (
    echo Creating Python virtual environment...
    python -m venv .venv
    echo Installing backend dependencies...
    .venv\Scripts\pip install -r backend\requirements.txt
)

echo [2/3] Checking raw benchmark dataset...
if not exist "data\raw\life_insurance_new_business_data.csv" (
    echo Generating benchmark dataset...
    .venv\Scripts\python scripts\generate_benchmark_data.py
)

echo [3/3] Starting Backend and Frontend Servers...
echo Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "Insurance Intelligence API" cmd /k ".venv\Scripts\python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"

echo Starting Vite React Frontend on http://127.0.0.1:5173 ...
cd frontend
start "Insurance Intelligence Dashboard" cmd /k "npm run dev -- --host 127.0.0.1 --port 5173"
cd ..

echo.
echo ======================================================================
echo All services launched!
echo Frontend Dashboard: http://127.0.0.1:5173/
echo Backend Swagger API: http://127.0.0.1:8000/docs
echo ======================================================================
pause
