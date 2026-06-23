<!-- dox:child v1 -->
# `frontend/src/api/` — Backend API client modules

Per-domain HTTP clients for the FastAPI backend.

## What lives here

Every backend call goes through a module in this tree; components and hooks never call `fetch` directly. Domain folders map to backend route namespaces.

## Local conventions

- One file per endpoint/verb (e.g. `list.ts`, `create.ts`, `update.ts`).
- Normalize query params inside the API module before calling `buildQuery`.
- Binary downloads and multipart uploads use raw `fetch` in dedicated modules.

## Key files

| File | Role |
|------|------|
| `client.ts` | Base HTTP client, envelope unwrapping, `ApiError`, query builder. |
| `auth/login.ts` | `POST /auth/login`. |
| `auth/me.ts` | `GET /auth/me` — session restore. |
| `admin/users/list.ts` | `GET /admin/users` paginated list. |
| `jsw-stock/list.ts` | `GET /jsw-stock` with date + per-field filters. |
| `settings/jsw-stock-config/update.ts` | `PUT /admin/jsw-stock/config`. |

## Gotchas / fragile spots

- `buildQuery` serializes `null` as the string `'null'` — convert nullable params to `undefined`.
- `getList` expects `{ data, meta }` with pagination metadata.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: [`auth/`](auth/CLAUDE.md) · [`admin/`](admin/CLAUDE.md) · [`credit-report/`](credit-report/CLAUDE.md) · [`dashboard/`](dashboard/CLAUDE.md) · [`jsw-stock/`](jsw-stock/CLAUDE.md) · [`jvml-stock/`](jvml-stock/CLAUDE.md) · [`meta/`](meta/CLAUDE.md) · [`report/`](report/CLAUDE.md) · [`settings/`](settings/CLAUDE.md) · [`user/`](user/CLAUDE.md)
- Related repo docs: [`../../../frontend_docs/API_LAYER.md`](../../../frontend_docs/API_LAYER.md)
