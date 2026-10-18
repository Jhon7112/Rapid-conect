@echo off
echo ========================================================
echo            Starting Reacher Application...              
echo ========================================================

echo Launching Backend Server on http://127.0.0.1:8000...
start "Reacher Backend" cmd /k "cd /d "%~dp0backend" && .\venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"

echo Launching Frontend Dev Server on http://localhost:5173...
start "Reacher Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo Waiting for servers to initialize...
timeout /t 3 >nul

echo Opening browser at http://localhost:5173...
start http://localhost:5173/

echo ========================================================
echo Reacher is running!
echo   Frontend: http://localhost:5173/
echo   Backend API: http://127.0.0.1:8000
echo ========================================================
