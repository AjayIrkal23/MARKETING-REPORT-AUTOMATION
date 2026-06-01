# BE implementation note: `ingest.py` + `customer_map.py`

**Area:** `app/services/jsw_stock/ingest.py` and `app/services/jsw_stock/customer_map.py`

**Validation status:** SPEC §2 is correct and buildable. All Beanie 2.1.0 APIs confirmed live
against the venv. Two clarifications captured below.

---

## Verified Beanie 2.1.0 API facts

All confirmed via `.venv/bin/python -c` introspection:

| API | Exists | Signature / notes |
|-----|--------|-------------------|
| `Document.insert_many(docs)` | YES | `async`; returns `InsertManyResult`; count via `len(docs)` NOT return value |
| `Document.find({"k": v}).delete()` | YES | `find()` returns `FindMany`; `.delete()` returns `DeleteMany` which implements `__await__` — single `await` is correct |
| `Document.distinct(key, filter)` | YES | On `Document` class, filter is 2nd positional arg (NOT keyword `filter=`) |
| `FindMany.distinct(...)` | NO | `distinct` is NOT on `FindMany`; it is a `Document` classmethod only |
| `FindMany.project(Model)` | YES | Available but not needed for `customer_map.py` (use raw dict query + manual projection) |
| `FindMany.to_list()` | YES | `async`; takes optional `length: int | None` |

**SPEC §2 `options.py` call** — `JswStock.distinct(query.field, filt)` — is correct because
`distinct` is the class-level method.

**SPEC §2 `customer_map.py` call** — `CustomerCode.find({"code": {"$in": [...]}})` uses dict
filter as positional `*args` to `Document.find(*args)` — this is correct per the Beanie 2.x
find signature.

---

## Clarifications vs SPEC (not errors — precision additions)

### 1. `delete()` requires `await` (not double-await)

SPEC writes `await JswStock.find({"report_date": report_date}).delete()`.
This is correct. `DeleteMany.__await__` is defined; it is NOT a coroutine function,
so do not write `await await ...`. One `await` suffices.

### 2. `CustomerCode.code` is not unique — first-match-per-code wins

Confirmed in `customer_code.py` docstring: "code is NOT unique — the same SAP customer
code may appear across multiple ship-to rows". `build_customer_map` MUST use `to_list()`
and take the FIRST document encountered for each code. This is already what the SPEC
says ("first-match-per-code wins"); just do not assume `find` returns one result per code.

### 3. `AsyncOption` import path

The SPEC says "Reuse `AsyncOption` imported from `...schemas.admin_user`". This is correct —
`AsyncOption` lives in `app/schemas/admin_user.py` (line 128). The `customer_code` options
service creates a type alias `CustomerCodeOption = AsyncOption` from that import. For
`jsw_stock/options.py` import directly from `...schemas.admin_user` and use `AsyncOption`
directly (no alias needed).

### 4. Audit category string is `"jsw_stock"` (singular, underscore)

The existing `AuditCategory` Literal (in `app/models/audit_log.py`) has `"regions"` and
`"customer_codes"` (plural). The SPEC adds `"jsw_stock"` — note it is singular and uses
underscore, unlike `"customer_codes"`. The orchestrator wiring pass adds it to
`AuditCategory` in both `models/audit_log.py` and `schemas/audit_log.py`.

### 5. `insert_many` chunk count

The returned `InsertManyResult` does NOT reliably expose inserted count when using
`ordered=False`. Always track `len(batch)` at the call site and sum. The SPEC says
"return inserted count" — return `sum(len(chunk) for chunk in batches)`.

---

## Exact skeletons

### `app/services/jsw_stock/customer_map.py`

```python
"""Customer-code lookup for JSW Stock ingest: batch-resolve normalized party codes."""

from __future__ import annotations

from ...models.customer_code import CustomerCode


async def build_customer_map(
    normalized_codes: set[str],
) -> dict[str, tuple[str | None, str | None]]:
    """Return ``{normalized_code: (customer_name, customer_code_id_hex)}``.

    Queries CustomerCode once with ``$in`` — O(1) DB round-trips regardless
    of row count (``backend-performance-standards``).
    First document found per code wins (code is NOT unique in customer_codes).
    Returns ``{}`` immediately when *normalized_codes* is empty.

    Args:
        normalized_codes: Set of party codes after ``lstrip("0")``.

    Returns:
        Dict mapping each code to ``(customer_name, str(doc.id))``; codes
        not found in customer_codes map to ``(None, None)``.
    """
    if not normalized_codes:
        return {}

    docs: list[CustomerCode] = await CustomerCode.find(
        {"code": {"$in": list(normalized_codes)}}
    ).to_list()

    result: dict[str, tuple[str | None, str | None]] = {}
    for doc in docs:
        # First match per code wins — do not overwrite.
        if doc.code not in result:
            result[doc.code] = (doc.customer, str(doc.id))

    return result
```

**Line count:** ~45 lines. Well under 250.

---

### `app/services/jsw_stock/ingest.py`

```python
"""Idempotent bulk ingest for a single ZSD_CURRSTK_HR.xlsx report file."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any

from ...models.jsw_stock import JswStock
from ...services.audit.events import audit_jsw_stock_event
from ...utils.jsw_stock.columns import coerce_value, COLUMNS
from ...utils.jsw_stock.excel import parse_workbook
from .customer_map import build_customer_map

_CHUNK_SIZE = 1000


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_party_code(raw: str | None) -> str | None:
    """Strip leading zeros from a raw Party Code string."""
    if raw is None:
        return None
    s = str(raw).strip()
    return s.lstrip("0") or None   # empty after strip → None


async def ingest_file(path: str, report_date: str) -> int:
    """Parse *path*, map customer codes, bulk-insert into ``jsw_stock``.

    Idempotent: deletes all existing docs for *report_date* before insert.
    Inserts in chunks of 1 000 to avoid BSON document-size limits.
    Emits ``jsw_stock.ingested`` audit event on success.

    Args:
        path:        Absolute path to the ``.xlsx`` file.
        report_date: Folder-date string ``"dd-mm-yyyy"`` (used as
                     ``report_date`` field and idempotency key).

    Returns:
        Total number of rows inserted.

    Raises:
        Exception: Any parse or DB error propagates to the caller
                   (``poller.py`` catches and marks ``error`` status).
    """
    # 1. Parse the workbook (tolerant raw-zip reader — no openpyxl).
    with open(path, "rb") as fh:
        raw_bytes = fh.read()

    rows: list[dict[str, Any]] = parse_workbook(raw_bytes)

    # 2. Collect normalized party codes for batch customer lookup.
    normalized_codes: set[str] = set()
    for row in rows:
        pcode = _normalize_party_code(row.get("party_code"))
        if pcode:
            normalized_codes.add(pcode)

    customer_map = await build_customer_map(normalized_codes)

    # 3. Idempotent delete: remove any existing docs for this report_date.
    await JswStock.find({"report_date": report_date}).delete()

    # 4. Build JswStock documents.
    now = _now_utc()
    docs: list[JswStock] = []
    for row in rows:
        # Apply type coercion for all 72 columns.
        coerced: dict[str, Any] = {
            field: coerce_value(field, row.get(field))
            for _, field, _ in COLUMNS
        }

        # Compute normalized party code and customer mapping.
        pcode_norm = _normalize_party_code(coerced.get("party_code"))
        customer_name: str | None = None
        customer_code_id: str | None = None
        if pcode_norm and pcode_norm in customer_map:
            customer_name, customer_code_id = customer_map[pcode_norm]

        docs.append(
            JswStock(
                **coerced,
                party_code_normalized=pcode_norm,
                customer_name=customer_name,
                customer_code_id=customer_code_id,
                report_date=report_date,
                source_file=path,
                created_at=now,
                updated_at=now,
            )
        )

    # 5. Chunked insert.
    inserted = 0
    for i in range(0, len(docs), _CHUNK_SIZE):
        chunk = docs[i : i + _CHUNK_SIZE]
        await JswStock.insert_many(chunk)
        inserted += len(chunk)

    # 6. Audit.
    await audit_jsw_stock_event(
        "jsw_stock.ingested",
        summary=f"Ingested {inserted} rows for {report_date}",
        extra={"report_date": report_date, "row_count": inserted, "source_file": path},
    )

    return inserted
```

**Line count:** ~90 lines. Well under 250.

---

### `app/services/audit/events.py` — append (orchestrator wiring pass)

```python
async def audit_jsw_stock_event(
    action: str,
    summary: str,
    outcome: str = "success",
    actor_email: str | None = None,
    extra: dict[str, Any] | None = None,
) -> None:
    """Record a JSW stock ingest or config event.

    Args:
        action:      Dot-namespaced identifier, e.g. ``"jsw_stock.ingested"``.
        summary:     Human-readable description.
        outcome:     ``"success"`` | ``"failure"`` | ``"error"``; defaults to ``"success"``.
        actor_email: Admin actor email; ``None`` for system-triggered events.
        extra:       Arbitrary context (report_date, row_count, source_file).
    """
    await record_audit(
        category="jsw_stock",   # matches AuditCategory Literal after wiring
        action=action,
        summary=summary,
        outcome=outcome,
        source="service",
        actor_email=actor_email,
        extra=extra,
    )
```

Import: no new import needed — `record_audit` is already in `events.py`.

---

### `app/services/jsw_stock/options.py` — distinct call pattern

```python
from ...models.jsw_stock import JswStock
from ...schemas.admin_user import AsyncOption
from ...schemas.jsw_stock import JswStockOptionsQuery
import re

async def search_field_options(query: JswStockOptionsQuery) -> list[AsyncOption]:
    filt: dict = {}
    if query.q:
        filt[query.field] = {"$regex": re.escape(query.q), "$options": "i"}

    # Beanie 2.x: filter is 2nd positional arg on Document classmethod.
    values: list = await JswStock.distinct(query.field, filt)

    results: list[AsyncOption] = []
    for v in values:
        if v is None:
            continue
        s = str(v).strip()
        if s:
            results.append(AsyncOption(value=s, label=s))

    results.sort(key=lambda o: o.label.lower())
    return results[: query.limit]
```

---

## Party Code join — confirmed against macro_docs

From `macro_docs/README.md` (authoritative):

> In `ZSD_CURRSTK_HR`, `Party Code` is the **zero-padded 10-digit** form
> (e.g. `0000040000088`). Strip leading zeros to match `Customer`.
> Short codes `8451–8499` / `8001`-style = internal JSW stock-transfer yards,
> not external customers.

Implementation rules:
- `party_code` field = stored verbatim (raw text from workbook, trimmed).
- `party_code_normalized` = `party_code.lstrip("0")` — this is the join key.
- `build_customer_map` queries `CustomerCode.code` using the normalized values.
- `CustomerCode.code` stores SAP codes as entered (e.g. `40000088`) — no zero-padding.
- `_normalize_party_code` returns `None` for empty string after lstrip (e.g. code was
  all zeros — unlikely in practice but guard it).
- Internal JSW yard codes (8451–8499, 8001-style) will lstrip to `8451` etc. and will
  not match any `CustomerCode.code` entry — `customer_name` and `customer_code_id` stay
  `None`. This is correct and expected behaviour per SPEC.

---

## 250-line budget check

| File | Est. lines |
|------|-----------|
| `customer_map.py` | ~45 |
| `ingest.py` | ~90 |
| `options.py` | ~50 |
| `audit events.py` append | ~20 (inline, no new file) |

All well within budget.

---

## Builder checklist

- [ ] `customer_map.py`: import `CustomerCode` from `...models.customer_code`; no other models.
- [ ] `ingest.py`: `open(path, "rb")` in sync (file is on local disk; no async needed).
- [ ] `ingest.py`: delete BEFORE building docs (not after) — ensures idempotency even on partial failure.
- [ ] `ingest.py`: pass `chunk` (a list slice) to `insert_many`, not the full `docs` list.
- [ ] `ingest.py`: do NOT pass `ordered=False` unless you specifically want partial-failure tolerance; default `ordered=True` is safer for debug.
- [ ] `options.py`: import `AsyncOption` from `...schemas.admin_user` (NOT from `...schemas.customer_code`).
- [ ] `options.py`: `JswStock.distinct(field, filt)` — filter is 2nd positional arg, NOT keyword.
- [ ] Audit: `category="jsw_stock"` — only valid after orchestrator adds it to `AuditCategory` Literal in `models/audit_log.py` and `schemas/audit_log.py`. If building ingest before the wiring pass, use a string literal and accept the type-checker warning temporarily.
- [ ] Verify: `await JswStock.find({"report_date": report_date}).delete()` — single await, returns `DeleteResult`.
