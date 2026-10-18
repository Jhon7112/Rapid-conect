@echo off
echo ========================================================
echo        Running Rapid Conect Database Migration...         
echo ========================================================

cd /d "%~dp0backend"
if exist "venv\Scripts\python.exe" (
    call .\venv\Scripts\activate
    python migrate.py
) else (
    python migrate.py
)

cd /d "%~dp0"
echo ========================================================
