# JSW Ping-Pong API

Minimal FastAPI service. The core endpoint answers **`ping` → `pong`**.

## Stack (latest as of 2026-05-29)
- Python 3.13
- FastAPI 0.136 · Starlette 1.2 · Pydantic 2.13
- Uvicorn 0.48 (`[standard]` — uvloop, httptools, websockets)

## Setup
```bash
cd backend
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt
```

## Run
```bash
./run.sh
# or:
./.venv/bin/uvicorn app.main:app --reload --port 8000
```

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Endpoints
| Method | Path | Returns |
|--------|------|---------|
| GET | `/` | service banner |
| GET | `/health` | `{status, version, uptime_seconds}` |
| GET | `/ping` | `{message:"pong", seq, timestamp}` |
| WS  | `/ws/ping` | send `ping` → receive `pong` |

## Quick check
```bash
curl http://localhost:8000/ping
# {"message":"pong","seq":1,"timestamp":"..."}
```
