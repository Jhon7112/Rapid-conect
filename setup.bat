@echo off
echo ========================================================
echo          Setting up Rapid Conect Project...                
echo ========================================================

echo [1/4] Setting up Python backend virtual environment...
cd /d "%~dp0backend"
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
) else (
    echo Virtual environment already exists.
)

echo [2/4] Installing Python backend dependencies...
call .\venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt

echo [3/4] Checking environment configuration...
if not exist ".env" (
    echo Creating backend .env file from .env.example...
    copy .env.example .env
) else (
    echo Backend .env file already exists.
)

echo [4/4] Installing Node frontend dependencies...
cd /d "%~dp0frontend"
call npm install

cd /d "%~dp0"

echo ========================================================
echo     Rapid Conect Setup Completed Successfully!             
echo ========================================================
echo You can now start the application by running:
echo   .\run.bat   (or double-clicking run.bat)
echo ========================================================
