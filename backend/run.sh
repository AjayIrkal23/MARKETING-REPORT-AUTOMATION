#!/usr/bin/env bash
# Start the JSW Ping-Pong API on http://localhost:8000 (docs at /docs).
set -euo pipefail
cd "$(dirname "$0")"
exec ./.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
