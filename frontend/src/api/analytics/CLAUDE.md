<!-- dox:child v1 -->
# `frontend/src/api/analytics/` — Analytics API clients

HTTP wrappers for the `/analytics` endpoints.

## What lives here

`GET /analytics/stock-dashboard` and `GET /analytics/options` clients used by the
analytics feature hook.

## Local conventions

- One file per endpoint.
- Multi-select arrays are appended manually to the query string because the shared
  `buildQuery` helper only supports scalar values.

## Key files

| File | Role |
|------|------|
| `dashboard.ts` | `getAnalyticsDashboard` and `searchAnalyticsFieldOptions` with array-param serialization. |

## Gotchas / fragile spots

- `getAnalyticsDashboard` serializes dimension arrays as repeated query params.
  Any new multi-select field must be added both here and in the backend
  `AnalyticsQuery` whitelist.
- The options fetcher is curried so it can be dropped straight into
  `AsyncCombobox` / `MultiSelectAsyncCombobox`.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../frontend_docs/API_LAYER.md`](../../../../frontend_docs/API_LAYER.md)
