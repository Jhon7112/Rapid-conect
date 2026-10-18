# Rapid Conect - Bulk Vendor Email & Outreach Management System

Rapid Conect is a full-stack bulk email outreach platform designed for vendor management, email personalization, and delivery tracking powered by FastAPI, PostgreSQL / Supabase, SQLite, React (Vite), and Gmail API.

---

## 🚀 Quick Setup & Execution

### 1. Clone the Repository
```bash
git clone https://github.com/Jhon7112/Rapid-conect.git
cd Rapid_conect
```

### 2. One-Command Automated Setup (`setup`)

#### 💻 Windows (CMD / PowerShell):
```cmd
.\setup.bat
```
*Or simply double-click `setup.bat` in File Explorer.*

#### 🐧 macOS / Linux:
```bash
chmod +x setup.sh run.sh
./setup.sh
```

**What `setup` automatically does:**
- Creates Python virtual environment (`backend/venv`).
- Installs Python dependencies (`backend/requirements.txt`).
- Generates `backend/.env` from template.
- Installs Node modules (`frontend/package.json`).
- Initializes SQLite database with default schema and sample templates.

---

### 3. One-Command Run (`run`)

#### 💻 Windows (CMD / PowerShell):
```cmd
.\run.bat
```
*Or simply double-click `run.bat` in File Explorer.*

#### 🐧 macOS / Linux:
```bash
./run.sh
```

**What `run` automatically does:**
- Launches Backend FastAPI server on `http://127.0.0.1:8000`.
- Launches Frontend Vite dev server on `http://localhost:5173/`.
- Opens your default web browser automatically to `http://localhost:5173/`.

---

## 🛠️ Manual Execution (Alternative)

### Backend
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🌟 Key Features
- **Vendor Management**: Create, edit, bulk import (CSV/Excel), and manage vendor records.
- **Bulk Email Campaigns**: Compose personalized emails using placeholders (`{{vendor_name}}`, `{{company_name}}`).
- **Sequential Gmail Dispatch**: Integrated Gmail API for rate-limited, reliable email delivery.
- **Campaign Monitoring & Delivery Metrics**: Real-time status cards (Total, Sent, Failed), recipient delivery logs, and single-click Retry for failed emails.
- **Rate Limit Alerts**: Graceful detection and visual warnings for Gmail quota limits.

---

## 🔒 Environment Configuration (`backend/.env`)
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/google/callback
SECRET_KEY=reacher-jwt-secret-key-2026-production
DATABASE_URL=sqlite:///./reacher.db
```
