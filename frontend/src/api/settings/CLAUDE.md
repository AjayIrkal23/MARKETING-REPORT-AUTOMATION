<!-- dox:child v1 -->
# `frontend/src/api/settings/` — Settings API clients

HTTP wrappers for the `/admin/*-config` scheduler settings endpoints.

## What lives here

Each ingestible report domain (JSW Stock, JVML Stock, Credit Report) has its own config/status/run-now sub-folder.

## Local conventions

- Each config module uses `putData` for updates.
- Run-now endpoints trigger a backend job and return the updated status.

## Key files

| File | Role |
|------|------|
| `jsw-stock-config/get.ts` | `GET /admin/jsw-stock/config`. |
| `jsw-stock-config/update.ts` | `PUT /admin/jsw-stock/config`. |
| `jsw-stock-config/status.ts` | `GET /admin/jsw-stock/status`. |
| `jsw-stock-config/runNow.ts` | `POST /admin/jsw-stock/run-now`. |

## Gotchas / fragile spots

- Config objects are singletons — there is no `id` field.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: [`credit-report-config/`](credit-report-config/CLAUDE.md) · [`jsw-stock-config/`](jsw-stock-config/CLAUDE.md) · [`jvml-stock-config/`](jvml-stock-config/CLAUDE.md)
- Related repo docs: [`../../../../frontend_docs/API_LAYER.md`](../../../../frontend_docs/API_LAYER.md)
