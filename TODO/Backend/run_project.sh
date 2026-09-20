#!/usr/bin/env bash
set -e

echo "======================================================================"
echo "Insurance Intelligence: Life Insurance New Business Forecasting Platform"
echo "======================================================================"
echo ""

if [ ! -d ".venv" ]; then
    echo "[1/3] Creating Python virtual environment..."
    python3 -m venv .venv
    echo "Installing dependencies..."
    .venv/bin/pip install -r backend/requirements.txt
fi

if [ ! -f "data/raw/life_insurance_new_business_data.csv" ]; then
    echo "[2/3] Generating raw benchmark dataset..."
    .venv/bin/python scripts/generate_benchmark_data.py
fi

echo "[3/3] Starting Backend & Frontend..."
.venv/bin/python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

cd frontend
npm run dev -- --host 127.0.0.1 --port 5173 &
FRONTEND_PID=$!
cd ..

echo "Backend running on http://127.0.0.1:8000 (PID $BACKEND_PID)"
echo "Frontend running on http://127.0.0.1:5173 (PID $FRONTEND_PID)"

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
