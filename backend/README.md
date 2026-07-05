# FinPilot Backend

FastAPI backend for FinPilot AI.

## Run locally

```bash
cd backend
./scripts/setup-venv311.ps1
./scripts/run-dev.ps1
```

This project is locked to Python 3.11 for backend runtime stability on Windows.

Manual equivalent:

```bash
cd backend
py -3.11 -m venv .venv311
.venv311\Scripts\python.exe -m pip install -e .[dev]
.venv311\Scripts\python.exe -m alembic upgrade head
.venv311\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## Environment

Create a `.env` file in `backend/` with:

```env
APP_ENV=development
DATABASE_URL=sqlite:///./data/finpilot.db
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```
