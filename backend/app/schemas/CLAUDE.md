<!-- dox:child v1 -->
# `backend/app/schemas/` — Pydantic request/response DTOs

Typed I/O contracts for every endpoint: query params, mutation bodies, and
public response shapes.

## What lives here

Each domain has its own schema module. Shared building blocks live in
`common.py`. Query schemas extend `PageQuery` and pin `sortBy` to a `Literal`
whitelist so unknown sort keys are rejected at parse time.

## Local conventions

- Extend `common.PageQuery` for any paginated list request.
- Use `Literal[...]` for `sortBy` and enum filter fields.
- Public DTOs expose `id` as a plain string, never as `ObjectId`.
- `AsyncOption` is defined once in `admin_user.py`; other domains import it from
  there (do not redefine it).
- Keep DTOs transport-free — no `Request`/`Response` objects.

## Key files

| File | Role |
|------|------|
| `__init__.py` | Re-exports common list/query DTOs. |
| `common.py` | `PageQuery`, `SortOrder`, pagination base. |
| `meta.py` | Root/health/ping response DTOs. |
| `auth.py` | Login request/response and account-status DTOs. |
| `otp.py` | OTP setup request/response DTOs. |
| `user.py` | Public user list/query DTOs. |
| `admin_user.py` | Admin user management + shared `AsyncOption` DTOs. |
| `audit_log.py` | Audit log query/list/detail/facet DTOs + taxonomy Literals. |
| `coil_price.py` | Coil price query/mutation/response DTOs. |
| `region.py` | Region query/mutation/response/options DTOs. |
| `customer_code.py` | Customer-code query/mutation/import/response DTOs. |
| `credit_report.py` / `credit_report_record.py` / `credit_report_config.py` | Credit report query, row, config, status, and zone-run DTOs. |
| `jsw_stock.py` / `jsw_stock_record.py` | JSW stock query and public row DTOs. |
| `jvml_stock.py` / `jvml_stock_record.py` | JVML stock query and public row DTOs. |
| `report.py` | RAKE pivot report query/response DTOs. |
| `dashboard.py` | Dashboard ingestion-status DTOs. |
| `cleanup.py` | Shared duplicate-cleanup response DTO. |

## Gotchas / fragile spots

- `Region` list uses query key `region` in stock/credit schemas, but it maps to
  `region_id` or `customer_code_id` internally.
- Customer-code schemas import `AsyncOption` from `.admin_user` only.
- Export routes bypass `response_model`, so the public record DTOs are used by
  services directly for serialization.
- Credit-report status includes today's `zones[]` and `dup_party_count`; row
  list/export DTOs intentionally do not expose provenance filtering knobs.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`backend_docs/API_CONTRACT.md`](../../backend_docs/API_CONTRACT.md)
