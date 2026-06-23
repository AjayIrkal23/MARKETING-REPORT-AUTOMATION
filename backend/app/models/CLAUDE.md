<!-- dox:child v1 -->
# `backend/app/models/` — Beanie document models

MongoDB document models (one per collection) using Beanie 2.x.

## What lives here

Each module declares a `Document` subclass with fields, indexes, and a
`Settings.name` collection name. The package `__init__.py` aggregates all models
so `core.database` can register them in `DOCUMENT_MODELS`.

## Local conventions

- Add every new `Document` to `__init__.py::__all__` and to
  `core/database.py::DOCUMENT_MODELS`.
- Use `Annotated[..., Indexed()]` for fields that are filtered or sorted.
- Store datetimes as UTC (`datetime.now(timezone.utc)`); the DB client is
  configured with `tz_aware=True`.
- Collection names are explicit in `class Settings: name = ...`.

## Key files

| File | Role |
|------|------|
| `__init__.py` | Aggregates exports for all document models. |
| `user.py` | `User` collection (`users`) — login, status, OTP fields. |
| `audit_log.py` | `AuditLog` collection (`audit_logs`) — audit taxonomy Literals. |
| `region.py` | `Region` collection (`regions`) — notification groups. |
| `coil_price.py` | `CoilPrice` collection (`coil_prices`). |
| `customer_code.py` | `CustomerCode` collection (`customer_codes`) — SAP code master. |
| `jsw_stock.py` / `jvml_stock.py` | Stock row collections (`jsw_stock`, `jvml_stock`). |
| `jsw_stock_config.py` / `jvml_stock_config.py` | Singleton scheduler configs. |
| `jsw_stock_ingestion.py` / `jvml_stock_ingestion.py` | Per-date ingestion status. |
| `credit_report.py` | `CreditReport` collection (`credit_report`). |
| `credit_report_config.py` | Singleton credit-report scheduler config. |
| `credit_report_ingestion.py` | Per-date credit-report ingestion status. |

## Gotchas / fragile spots

- `CustomerCode.code` is **not unique** — a single SAP customer may have multiple
  ship-to rows.
- Stock models contain ~72 source columns plus mapping/meta fields; keep them in
  sync with `utils/jsw_stock/columns.py` and `utils/jvml_stock/columns.py`.
- Stock/credit parsers are raw-zip readers (not `openpyxl`) because the source
  files contain malformed numeric cells.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`backend_docs/DATABASE.md`](../../backend_docs/DATABASE.md)
