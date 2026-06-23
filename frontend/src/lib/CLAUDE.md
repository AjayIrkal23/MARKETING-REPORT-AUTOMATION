<!-- dox:child v1 -->
# `frontend/src/lib/` — local rules (dox)

> Local doc for this directory only. Read after the root `CLAUDE.md`. Update this
> file whenever you add, remove, or rename files here, or change a local convention.

## What lives here

Centralized, framework-agnostic utilities used across the application: API
client, Tailwind class merging, and shared browser helpers.

## Local conventions

- Keep modules free of React/UI state unless their name explicitly says so.
- API calls live in `src/api/<domain>/`; helpers that wrap browser APIs
  (download, upload, etc.) live here.

## Key files

| File | Role |
|------|------|
| `api.ts` | Base HTTP client, `ApiError`, and `buildQuery`. |
| `download.ts` | Shared `downloadBlob` and `downloadFromFetch` helpers for binary backend responses. |
| `utils.ts` | `cn()` Tailwind class-merge utility. |

## Gotchas / fragile spots

- `downloadFromFetch` intentionally uses raw `fetch` with `credentials: "include"`
  because download endpoints return binary streams, not the standard JSON envelope.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`frontend_docs/API_LAYER.md`](../../../frontend_docs/API_LAYER.md)
