#!/bin/bash

echo "========================================================"
echo "        Starting Rapid Conect Application...            "
echo "========================================================"

cd "$(dirname "$0")"

echo "Starting Backend Uvicorn Server..."
(cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port 8000) &
BACKEND_PID=$!

echo "Starting Frontend Vite Dev Server..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT

echo "Waiting for servers to initialize..."
sleep 3

if command -v open > /dev/null; then
    open http://localhost:5173/
elif command -v xdg-open > /dev/null; then
    xdg-open http://localhost:5173/
fi

echo "========================================================"
echo "Rapid Conect is running!"
echo "  Frontend: http://localhost:5173/"
echo "  Backend API: http://127.0.0.1:8000"
echo "Press Ctrl+C to stop both servers."
echo "========================================================"

wait
