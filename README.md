# Marketing Report Automation

JSW Steel marketing tooling — a FastAPI backend, a JSW-themed React dashboard, and a
data dictionary for the source Excel reports.

## Layout
```
.
├── backend/        FastAPI "ping → pong" API (Python venv, latest packages)
├── frontend/       Vite + React + TS dashboard (Tailwind v4, shadcn, Redux, router, JSW theme)
├── macro_docs/     Data dictionary for the Excel files (for the AI agent)
└── macro_files/    Source Excel reports
```

## Quickstart
```bash
# Backend  →  http://localhost:8000  (docs at /docs)
cd backend
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt
./run.sh

# Frontend →  http://localhost:5173   (run in a second terminal)
cd frontend
npm install
npm run dev
```
Then open http://localhost:5173 — sign in (any non-empty credentials) and the dashboard's
**Ping-Pong API** card will show live `pong` responses from the backend.

## Components
| Area | Stack | Docs |
|------|-------|------|
| Backend | Python 3.13 · FastAPI 0.136 · Uvicorn 0.48 · Pydantic 2.13 | [backend/README.md](backend/README.md) |
| Frontend | Vite 8 · React 19 · Tailwind v4 · shadcn/ui · Redux Toolkit · React Router 7 | [frontend/README.md](frontend/README.md) |
| Data | Excel data dictionary (credit / customers / HR stock) | [macro_docs/README.md](macro_docs/README.md) |

Screenshots of the dashboard live in `frontend/screenshots/`.
