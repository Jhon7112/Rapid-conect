@echo off
echo ========================================================
echo         Starting Rapid Conect Application...              
echo ========================================================

echo Launching Backend Server on http://127.0.0.1:8000...
start "Rapid Conect Backend" cmd /k "cd /d "%~dp0backend" && .\venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"

echo Launching Frontend Dev Server on http://localhost:5173...
start "Rapid Conect Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo Waiting for servers to initialize...
timeout /t 3 >nul

echo Opening browser at http://localhost:5173...
start http://localhost:5173/

echo ========================================================
echo Rapid Conect is running!
echo   Frontend: http://localhost:5173/
echo   Backend API: http://127.0.0.1:8000
echo ========================================================
