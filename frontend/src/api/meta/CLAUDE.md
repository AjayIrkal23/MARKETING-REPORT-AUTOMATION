<!-- dox:child v1 -->
# `frontend/src/api/meta/` — Meta / health API

HTTP wrappers for unauthenticated status endpoints.

## What lives here

Lightweight endpoints for connectivity and health checks. These do not require a session and are useful for boot diagnostics.

## Local conventions

- Keep these endpoints free of business logic.

## Key files

| File | Role |
|------|------|
| `ping.ts` | `GET /ping` — liveness check. |
| `health.ts` | `GET /health` — service health summary. |

## Gotchas / fragile spots

- Do not use these for auth state — use `GET /auth/me` instead.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../frontend_docs/API_LAYER.md`](../../../../frontend_docs/API_LAYER.md)
