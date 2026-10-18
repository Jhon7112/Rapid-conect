#!/bin/bash
set -e

echo "========================================================"
echo "        Setting up Rapid Conect Project...              "
echo "========================================================"

echo "[1/4] Setting up Python backend virtual environment..."
cd "$(dirname "$0")/backend"

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
else
    echo "Virtual environment already exists."
fi

echo "[2/4] Installing Python backend dependencies..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "[3/4] Checking environment configuration..."
if [ ! -f ".env" ]; then
    echo "Creating backend .env file from .env.example..."
    cp .env.example .env
else
    echo "Backend .env file already exists."
fi

echo "[4/4] Installing Node frontend dependencies..."
cd "$(dirname "$0")/frontend"
npm install

cd "$(dirname "$0")"

echo "========================================================"
echo "    Rapid Conect Setup Completed Successfully!          "
echo "========================================================"
echo "You can now start the application by running:"
echo "  ./run.sh"
echo "========================================================"
