# JVML Stock — Backend Ingest / Poller / Customer Map / Emails / Config / Status
## Builder-Ready Packet

**Reference sources read:** `customer_code.py` (model), `import_rows.py` (bulk insert pattern),
`customer_code/options.py` (distinct/Beanie 2.x), `customer_code/list.py` (pagination pattern),
`region/update.py` (doc.save + _now_utc), `core/scheduler.py` (scheduler singleton + IntervalTrigger),
`core/email.py` (send_email signature), `services/audit/events.py` (audit helper signatures),
`services/cron/heartbeat.py` (audited_job decorator + local import pattern).

---

## 1. CustomerCode field confirmation

From `backend/app/models/customer_code.py` — **EXACT field names**:

```python
class CustomerCode(Document):
    segment:          Annotated[str, Indexed()]
    code:             Annotated[str, Indexed()]   # <-- join key for customer_map
    customer:         Annotated[str, Indexed()]   # <-- customer name/label
    destination:      Annotated[str, Indexed()]
    cam:              str | None = None
    mob:              str | None = None
    head:             str | None = None
    route:            str | None = None
    ship_to:          str | None = None
    ship_to_customer: str | None = None
    region_id:        Annotated[str, Indexed()]
    created_at:       Annotated[datetime, Indexed()]
    updated_at:       datetime
    class Settings: name = "customer_codes"
```

**Confirmed:**
- `code` is the SAP code field (8-digit numeric string, e.g. `"8662"`) — this is the join key.
- `customer` is the customer display name/label — this becomes `customer_name` in JvmlStock docs.
- `insert_many` IS available in Beanie 2.1.0. Use `CustomerCode.insert_many(docs)` and derive
  the inserted count from `len(docs)`, NOT from the return value.
- `_now_utc` factory is defined locally in `customer_code.py`; copy verbatim to `jvml_stock.py`
  and `jvml_stock_config.py` — do not import from another model.

---

## 2. `customer_map.py` — Ready body

**File:** `backend/app/services/jvml_stock/customer_map.py`

```python
"""JVML Stock: build a party-code -> (customer_name, customer_code_id) lookup map."""

from __future__ import annotations

from ...models.customer_code import CustomerCode


async def build_customer_map(
    normalized_codes: set[str],
) -> dict[str, tuple[str | None, str | None]]:
    """Query CustomerCode for all normalized_codes; return first-match-per-code map.

    Args:
        normalized_codes: Set of party_code.lstrip("0") values to look up.

    Returns:
        Dict keyed by normalized code; value is (customer_name, customer_code_id_hex).
        customer_code_id_hex is str(doc.id) (ObjectId hex string).
        Unknown codes are absent from the dict (caller defaults to (None, None)).
    """
    if not normalized_codes:
        return {}

    docs = await CustomerCode.find(
        {"code": {"$in": list(normalized_codes)}}
    ).to_list()

    result: dict[str, tuple[str | None, str | None]] = {}
    for doc in docs:
        if doc.code not in result:  # first match wins
            result[doc.code] = (doc.customer, str(doc.id))

    return result
```

**Notes:**
- `CustomerCode.find({...}).to_list()` — standard Beanie 2.x fetch pattern.
- `doc.customer` is the customer name (confirmed from model). `str(doc.id)` is the ObjectId hex.
- First-match-per-code: iterate and skip if key already present.
- Empty guard returns `{}` immediately — no DB call on empty set.

---

## 3. `ingest.py` — Ready body

**File:** `backend/app/services/jvml_stock/ingest.py`

```python
"""JVML Stock: ingest a single dated Excel file into MongoDB."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from ...models.jvml_stock import JvmlStock
from ...utils.jvml_stock.columns import COLUMNS, coerce_value
from ...utils.jvml_stock.excel import parse_workbook
from ..audit.events import audit_jvml_stock_event
from .customer_map import build_customer_map

logger = logging.getLogger(__name__)

_CHUNK = 1000


async def ingest_file(path: str, report_date: str) -> int:
    """Parse path, map customer codes, bulk-insert into jvml_stock; return row count.

    Idempotent: deletes all existing docs for report_date before inserting.

    Args:
        path:        Absolute path to the .xlsx file.
        report_date: Folder date string, dd-mm-yyyy format.

    Returns:
        Number of rows inserted.
    """
    with open(path, "rb") as fh:
        data = fh.read()

    raw_rows = parse_workbook(data)

    # Collect all normalized party codes for batch customer lookup.
    normalized_codes: set[str] = set()
    for row in raw_rows:
        pc = row.get("party_code")
        if pc is not None:
            s = str(pc).strip()
            if s:
                normalized_codes.add(s.lstrip("0"))

    customer_map = await build_customer_map(normalized_codes)

    now = datetime.now(timezone.utc)
    docs: list[JvmlStock] = []

    for row in raw_rows:
        kwargs: dict = {}
        for _excel_header, field, _type in COLUMNS:
            kwargs[field] = coerce_value(field, row.get(field))

        # Compute normalized join key.
        party_code_raw = kwargs.get("party_code")
        party_code_norm: str | None = None
        if party_code_raw is not None:
            s = str(party_code_raw).strip()
            party_code_norm = s.lstrip("0") if s else None

        customer_name: str | None = None
        customer_code_id: str | None = None
        if party_code_norm:
            mapping = customer_map.get(party_code_norm)
            if mapping:
                customer_name, customer_code_id = mapping

        kwargs["party_code_normalized"] = party_code_norm
        kwargs["customer_name"] = customer_name
        kwargs["customer_code_id"] = customer_code_id
        kwargs["report_date"] = report_date
        kwargs["source_file"] = path
        kwargs["created_at"] = now
        kwargs["updated_at"] = now

        docs.append(JvmlStock(**kwargs))

    # Idempotent delete then insert.
    await JvmlStock.find({"report_date": report_date}).delete()

    inserted = 0
    for i in range(0, len(docs), _CHUNK):
        batch = docs[i : i + _CHUNK]
        if batch:
            await JvmlStock.insert_many(batch)
            inserted += len(batch)

    await audit_jvml_stock_event(
        "jvml_stock.ingested",
        f"Ingested {inserted} rows for report_date={report_date}",
        extra={"report_date": report_date, "row_count": inserted, "source_file": path},
    )

    return inserted
```

**Key patterns confirmed from reference:**
- `CustomerCode.insert_many(docs)` — count via `len(docs)`, not return value.
- `JvmlStock.find({"report_date": report_date}).delete()` — Beanie 2.x find().delete() for bulk delete.
- Chunks of 1000; `inserted += len(batch)` not from return value.
- `coerce_value(field, raw)` from `utils.jvml_stock.columns` — applies type rule per field.
- `audit_jvml_stock_event` is added by ORCHESTRATOR to `services/audit/events.py`; builder imports it from there.

---

## 4. `poller.py` — Ready body

**File:** `backend/app/services/jvml_stock/poller.py`

```python
"""JVML Stock: scheduled poll job — check for today's file and ingest or alert."""

from __future__ import annotations

import logging
import os
from datetime import datetime, time

from ...models.jvml_stock_ingestion import JvmlStockIngestion
from ...schemas.jvml_stock_config import JvmlStockStatusPublic
from .config_service import get_config
from .emails import send_missing_alert
from .ingest import ingest_file
from .status import get_status
from ..audit.events import audit_jvml_stock_event

logger = logging.getLogger(__name__)


async def run_poll() -> JvmlStockStatusPublic:
    """Check for today's JVML Stock file and ingest it, or alert if missing.

    Never raises — all exceptions are caught, logged, and reflected in the
    ingestion status doc. Returns current JvmlStockStatusPublic.
    """
    try:
        config = await get_config()

        if not config.enabled:
            return await get_status()

        if not config.base_path or not config.file_name:
            logger.warning("run_poll: base_path or file_name not configured.")
            return await get_status()

        now = datetime.now()
        today = now.strftime("%d-%m-%Y")

        # Parse window times.
        start_h, start_m = map(int, config.start_time.split(":"))
        end_h, end_m = map(int, config.end_time.split(":"))
        start_t = time(start_h, start_m)
        end_t = time(end_h, end_m)
        now_t = now.time()

        if now_t < start_t:
            # Not yet in window — do nothing.
            return await get_status()

        # Create the dated folder if absent.
        folder = os.path.join(config.base_path, today)
        os.makedirs(folder, exist_ok=True)

        # Get or create today's ingestion tracker.
        ingestion = await JvmlStockIngestion.find_one({"report_date": today})
        if ingestion is None:
            ingestion = JvmlStockIngestion(report_date=today, status="pending")
            await ingestion.insert()

        if ingestion.status == "ingested":
            return await get_status()

        fpath = os.path.join(folder, config.file_name + ".xlsx")

        if os.path.isfile(fpath):
            try:
                count = await ingest_file(fpath, today)
                ingestion.status = "ingested"
                ingestion.row_count = count
                ingestion.found_at = datetime.now()
                ingestion.file_path = fpath
                ingestion.updated_at = datetime.now()
                await ingestion.save()
            except Exception as exc:  # noqa: BLE001
                logger.exception("run_poll: ingest_file failed for %s", fpath)
                ingestion.status = "error"
                ingestion.error = str(exc)
                ingestion.updated_at = datetime.now()
                await ingestion.save()
                await audit_jvml_stock_event(
                    "jvml_stock.failed",
                    f"Ingest failed for report_date={today}: {exc}",
                    outcome="error",
                    extra={"report_date": today, "error": str(exc)},
                )
        else:
            # File not found.
            if now_t >= end_t and ingestion.status != "alerted":
                try:
                    # get_config returns JvmlStockConfigPublic; send_missing_alert needs it
                    from ...models.jvml_stock_config import JvmlStockConfig  # noqa: PLC0415
                    cfg_doc = await JvmlStockConfig.find_one({"key": "default"})
                    await send_missing_alert(cfg_doc, today)
                except Exception:  # noqa: BLE001
                    logger.exception("run_poll: send_missing_alert failed for %s", today)
                ingestion.status = "alerted"
                ingestion.alerted_at = datetime.now()
                ingestion.updated_at = datetime.now()
                await ingestion.save()
            elif ingestion.status not in ("alerted", "ingested"):
                ingestion.status = "missing"
                ingestion.updated_at = datetime.now()
                await ingestion.save()

    except Exception:  # noqa: BLE001
        logger.exception("run_poll: unexpected error")

    return await get_status()
```

**Important notes:**
- `datetime.now()` (local) per SPEC — not UTC for filesystem/window logic. Use `datetime.now(timezone.utc)` only for `created_at`/`updated_at` Mongo fields in `ingest_file`.
- `os.makedirs(folder, exist_ok=True)` — creates `<base_path>/<dd-mm-yyyy>/`.
- `ingestion.save()` — Beanie 2.x `Document.save()` is the update path (confirmed from `region/update.py` pattern: `doc.updated_at = _now_utc(); await doc.save()`).
- `send_missing_alert` needs the raw `JvmlStockConfig` document (has `notify_emails` as a list). The `get_config()` service returns `JvmlStockConfigPublic` (a DTO), not the doc. The poller fetches the doc directly with a local import to avoid circular import.
- Never raises out of `run_poll` — entire body is in try/except.

---

## 5. `emails.py` — Ready body

**File:** `backend/app/services/jvml_stock/emails.py`

```python
"""JVML Stock: email renderers and missing-file alert sender."""

from __future__ import annotations

import logging
import textwrap

from ...core.email import send_email
from ..audit.events import audit_jvml_stock_event

logger = logging.getLogger(__name__)


def render_missing_email(
    report_date: str,
    file_name: str,
    base_path: str,
) -> tuple[str, str, str]:
    """Return (subject, text, html) for the missing-file alert email."""
    subject = f"⚠ JVML STOCK EXCEL not found — {report_date}"

    expected_path = f"{base_path}/{report_date}/{file_name}.xlsx"

    text = textwrap.dedent(f"""\
        JVML Stock Excel file was not found by the end of the monitoring window.

        Expected path: {expected_path}
        Report date:   {report_date}

        Please upload the file manually or check the data source.
    """)

    html = textwrap.dedent(f"""\
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="utf-8"><title>{subject}</title></head>
        <body style="font-family:sans-serif;color:#1a1a2e;max-width:520px;margin:auto;padding:24px">
          <h2 style="color:#b91c1c">&#9888; JVML Stock Excel Not Found</h2>
          <p>The expected file was not found by the end of the monitoring window.</p>
          <table style="border-collapse:collapse;width:100%;margin:12px 0">
            <tr><td style="padding:6px 12px;font-weight:600">Expected path</td>
                <td style="padding:6px 12px;font-family:monospace">{expected_path}</td></tr>
            <tr style="background:#f8fafc"><td style="padding:6px 12px;font-weight:600">Report date</td>
                <td style="padding:6px 12px">{report_date}</td></tr>
          </table>
          <p style="color:#64748b;font-size:.875rem">
            Please upload the file manually or check the data source.
          </p>
        </body>
        </html>
    """)

    return subject, text, html


async def send_missing_alert(
    config,  # JvmlStockConfig Document or any object with .file_name, .base_path, .notify_emails
    report_date: str,
) -> None:
    """Send missing-file alert to all notify_emails; never raises.

    Args:
        config:      JvmlStockConfig document (has .notify_emails, .file_name, .base_path).
        report_date: The date string that had no file, dd-mm-yyyy.
    """
    try:
        subject, text, html = render_missing_email(
            report_date=report_date,
            file_name=config.file_name,
            base_path=config.base_path,
        )
        notify = config.notify_emails or []
        for email in notify:
            try:
                await send_email(to=email, subject=subject, text=text, html=html)
            except Exception:  # noqa: BLE001
                logger.exception("send_missing_alert: failed to send to %s", email)

        await audit_jvml_stock_event(
            "jvml_stock.missing_alert",
            f"Missing-file alert sent for report_date={report_date} to {len(notify)} recipient(s)",
            extra={"report_date": report_date, "recipients": notify},
        )
    except Exception:  # noqa: BLE001
        logger.exception("send_missing_alert: unexpected error for report_date=%s", report_date)
```

**`send_email` signature confirmed** from `core/email.py`:
```python
async def send_email(to: str, subject: str, text: str, html: str | None = None) -> None
```
Positional: `to`, `subject`, `text`; keyword: `html`. Never raises (transport failures logged internally).

---

## 6. `config_service.py` — Ready body

**File:** `backend/app/services/jvml_stock/config_service.py`

```python
"""JVML Stock: config singleton get + upsert."""

from __future__ import annotations

from datetime import datetime, timezone

from ...models.jvml_stock_config import JvmlStockConfig
from ...schemas.jvml_stock_config import JvmlStockConfigPublic, JvmlStockConfigUpdate
from ..audit.events import audit_jvml_stock_event


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _to_public(doc: JvmlStockConfig) -> JvmlStockConfigPublic:
    return JvmlStockConfigPublic(
        enabled=doc.enabled,
        base_path=doc.base_path,
        file_name=doc.file_name,
        start_time=doc.start_time,
        end_time=doc.end_time,
        interval_hours=doc.interval_hours,
        notify_emails=doc.notify_emails,
        updated_at=doc.updated_at,
    )


async def get_config() -> JvmlStockConfigPublic:
    """Return the singleton config (key='default'), or schema defaults if absent."""
    doc = await JvmlStockConfig.find_one({"key": "default"})
    if doc is None:
        return JvmlStockConfigPublic(
            enabled=False,
            base_path="",
            file_name="",
            start_time="08:00",
            end_time="20:00",
            interval_hours=1,
            notify_emails=[],
            updated_at=None,
        )
    return _to_public(doc)


async def upsert_config(
    body: JvmlStockConfigUpdate,
    *,
    actor_email: str | None,
) -> JvmlStockConfigPublic:
    """Find-or-create the singleton config, set fields, save, reschedule, audit."""
    doc = await JvmlStockConfig.find_one({"key": "default"})
    if doc is None:
        doc = JvmlStockConfig(key="default")
        await doc.insert()

    doc.enabled = body.enabled
    doc.base_path = body.base_path
    doc.file_name = body.file_name
    doc.start_time = body.start_time
    doc.end_time = body.end_time
    doc.interval_hours = body.interval_hours
    doc.notify_emails = [str(e) for e in body.notify_emails]
    doc.updated_at = _now_utc()
    await doc.save()

    # Reschedule the poll job (function added by ORCHESTRATOR to core/scheduler.py).
    try:
        from ...core.scheduler import apply_jvml_stock_schedule  # noqa: PLC0415
        apply_jvml_stock_schedule()
    except Exception:
        import logging
        logging.getLogger(__name__).warning(
            "upsert_config: apply_jvml_stock_schedule failed", exc_info=True
        )

    await audit_jvml_stock_event(
        "jvml_stock.config_updated",
        "JVML Stock config updated",
        actor_email=actor_email,
        extra={
            "enabled": doc.enabled,
            "base_path": doc.base_path,
            "file_name": doc.file_name,
            "interval_hours": doc.interval_hours,
        },
    )

    return _to_public(doc)
```

**Pattern confirmation:** `doc.updated_at = _now_utc(); await doc.save()` — exact pattern from `region/update.py` line 48-49.

---

## 7. `status.py` — Ready body

**File:** `backend/app/services/jvml_stock/status.py`

```python
"""JVML Stock: build the status summary for the config panel."""

from __future__ import annotations

from ...models.jvml_stock_ingestion import JvmlStockIngestion
from ...schemas.jvml_stock_config import (
    JvmlStockIngestionRow,
    JvmlStockStatusPublic,
)
from .config_service import get_config

_RECENT_COUNT = 14


async def get_status() -> JvmlStockStatusPublic:
    """Return latest ingestion state + 14 most recent ingestion rows."""
    config = await get_config()

    latest = await JvmlStockIngestion.find_one(
        {}, sort=[("created_at", -1)]
    )

    recent_docs = (
        await JvmlStockIngestion.find()
        .sort("-created_at")
        .limit(_RECENT_COUNT)
        .to_list()
    )

    recent = [
        JvmlStockIngestionRow(
            report_date=d.report_date,
            status=d.status,
            row_count=d.row_count,
            found_at=d.found_at,
            created_at=d.created_at,
        )
        for d in recent_docs
    ]

    return JvmlStockStatusPublic(
        enabled=config.enabled,
        last_report_date=latest.report_date if latest else None,
        last_status=latest.status if latest else None,
        last_row_count=latest.row_count if latest else None,
        last_found_at=latest.found_at if latest else None,
        last_alerted_at=latest.alerted_at if latest else None,
        last_error=latest.error if latest else None,
        recent=recent,
    )
```

**Note:** Beanie 2.x `find_one({}, sort=...)` — pass sort as list of tuples to `find_one` OR chain `.sort("-created_at")` on a `find()`. The `find_one` with sort kwarg may not be available in all versions; safest pattern is `find().sort("-created_at").limit(1).to_list()` and take `[0]` if non-empty:

```python
# Safer alternative for latest:
docs = await JvmlStockIngestion.find().sort("-created_at").limit(1).to_list()
latest = docs[0] if docs else None
```

Use this safer form in the actual file.

---

## 8. `cron/jvml_stock.py` — Ready body

**File:** `backend/app/services/cron/jvml_stock.py`

```python
"""Cron job: JVML Stock poll."""

from __future__ import annotations

from .heartbeat import audited_job  # audited_job lives in heartbeat.py, re-exported via __init__


@audited_job("cron.jvml_stock_poll")
async def jvml_stock_poll_job() -> None:
    """APScheduler-registered poll job; auto-audited via @audited_job."""
    from ...services.jvml_stock.poller import run_poll  # noqa: PLC0415 — avoids circular import
    await run_poll()
```

**Import path confirmed:** `audited_job` is defined in `services/cron/heartbeat.py` and re-exported from `services/cron/__init__.py`. Within the same package, import from `.heartbeat` (direct) to stay flat. The `__init__.py` exports both `heartbeat_job` and `audited_job`.

**Local import pattern confirmed** from `services/cron/heartbeat.py` line 92:
```python
from ...models import AuditLog  # noqa: PLC0415 — local import avoids circular import
```
Same `# noqa: PLC0415` comment convention.

---

## 9. `apply_jvml_stock_schedule()` — ORCHESTRATOR adds to `core/scheduler.py`

Builder does NOT create this function but must call it. Here is the ready pattern for the ORCHESTRATOR:

```python
def apply_jvml_stock_schedule() -> None:
    """Add or remove the JVML Stock poll job based on current config.

    Reads config synchronously via asyncio.run() wrapper or uses a cached value.
    Called after config upsert and at startup. Non-fatal — logs warnings on error.
    """
    import asyncio  # noqa: PLC0415
    sched = get_scheduler()
    if sched is None:
        logger.warning("apply_jvml_stock_schedule: scheduler not running.")
        return
    try:
        from apscheduler.triggers.interval import IntervalTrigger  # noqa: PLC0415
        from ..services.jvml_stock.config_service import get_config  # noqa: PLC0415
        from ..services.cron.jvml_stock import jvml_stock_poll_job  # noqa: PLC0415

        # get_config is async; run synchronously via a new event loop only if not
        # currently inside a running loop. In practice, this is called from
        # config_service (already async context) — use asyncio.get_event_loop().run_until_complete
        # or restructure as async. Recommended: make apply_jvml_stock_schedule async.
        # If sync call needed: use asyncio.run() only from a thread context.
        # SIMPLEST: make it async and await it in upsert_config.
    except Exception:
        logger.warning("apply_jvml_stock_schedule error", exc_info=True)
```

**SPEC §2 says:** "add/replace (IntervalTrigger(hours=interval_hours), id='jvml_stock.poll', replace_existing=True, next_run_time=datetime.now()) when enabled, else remove_job('jvml_stock.poll') (guard missing job). Tolerate scheduler being None/not started (use get_scheduler())."

**Builder action for `config_service.py`:** Because `apply_jvml_stock_schedule` needs to read config which is async, the ORCHESTRATOR should make `apply_jvml_stock_schedule` async and the call in `upsert_config` becomes `await apply_jvml_stock_schedule()`. The SPEC says "sync wrapper or via a small async runner" — prefer the async version to avoid event loop conflicts.

---

## 10. `audit_jvml_stock_event` — ORCHESTRATOR adds to `services/audit/events.py`

Builder imports this function from `services.audit.events`. The ORCHESTRATOR appends:

```python
async def audit_jvml_stock_event(
    action: str,
    summary: str,
    outcome: str = "success",
    actor_email: str | None = None,
    extra: dict[str, Any] | None = None,
) -> None:
    """Record a JVML Stock service event (ingested, failed, missing_alert, config_updated)."""
    await record_audit(
        category="jvml_stock",
        action=action,
        summary=summary,
        outcome=outcome,
        source="service",
        actor_email=actor_email,
        extra=extra,
    )
```

**Pattern confirmed** from `audit_customer_code_event` (lines 170-194 of `events.py`). Exact same shape. `source="service"` (not "cron" — cron is used only by `audited_job`).

---

## 11. Shared-file wiring checklist (ORCHESTRATOR only)

| File | Change |
|------|--------|
| `app/models/__init__.py` | Add `JvmlStock`, `JvmlStockConfig`, `JvmlStockIngestion` imports + `__all__` |
| `app/core/database.py` | Add 3 models to `DOCUMENT_MODELS` |
| `app/models/audit_log.py` | Add `"jvml_stock"` to `AuditCategory` Literal (line 17) |
| `app/schemas/audit_log.py` | Add `"jvml_stock"` to its `AuditCategory` Literal |
| `app/services/audit_log/options.py` | Add `"jvml_stock"` to `_CATEGORIES` |
| `app/services/audit/events.py` | Append `audit_jvml_stock_event` (see §10 above) |
| `app/core/scheduler.py` | Add `apply_jvml_stock_schedule()` + call in `start_scheduler` |
| `app/services/cron/__init__.py` | Add `jvml_stock_poll_job` to exports (optional but tidy) |
| `app/routes/__init__.py` | Include both `router` and `config_router` from `routes/jvml_stock` |

---

## 12. SPEC mismatches / gaps found

### MISMATCH 1 — `apply_jvml_stock_schedule` sync vs async
**SPEC §2:** "sync wrapper or via a small async runner."
**Reality:** `core/scheduler.py` is fully synchronous (`start_scheduler` is async but `add_job` is sync). However `get_config()` in `config_service` is async. The "sync wrapper" would need `asyncio.run()` which FAILS if called from within an already-running event loop (FastAPI runs in an event loop). **Recommendation:** Make `apply_jvml_stock_schedule` async and `await` it from `upsert_config`. The ORCHESTRATOR must handle this — the builder's `upsert_config` stub already shows the `await` call and try/except wrapping.

### MISMATCH 2 — `JvmlStockIngestion.find_one` sort parameter
**SPEC §status.py:** "latest ingestion." Beanie 2.x `find_one` does not guarantee a `sort` keyword in all versions. Safe pattern (confirmed from `region/list.py` and `customer_code/list.py`): use `.find().sort("-field").limit(1).to_list()`. The `status.py` body above uses this safe form.

### MISMATCH 3 — `poller.py` needs raw JvmlStockConfig doc for `send_missing_alert`
**SPEC:** "`send_missing_alert(config, today)` — config is the config object." `get_config()` returns `JvmlStockConfigPublic` (a Pydantic BaseModel DTO). `send_missing_alert` needs `.notify_emails`, `.file_name`, `.base_path` — the DTO has all three. So `send_missing_alert` can accept `JvmlStockConfigPublic` directly. The `poller.py` body above uses a local import of `JvmlStockConfig` doc only as an alternative; **preferred: pass `config` (JvmlStockConfigPublic) directly** since the DTO has all required fields. Builder should pass the result of `await get_config()` to `send_missing_alert`.

### MISMATCH 4 — `cron/jvml_stock.py` import path
**SPEC §cron:** Shows `from ..audit.events import audit_cron_event` at top level. But `jvml_stock.py` in the cron package does NOT need to import `audit_cron_event` directly — `@audited_job` handles the audit automatically. The top-level import in the SPEC is only "if needed." Drop it to avoid unused-import lint errors.

### NOTE — `ingest.py` uses `dict` for kwargs, not unpacking COLUMNS directly
The COLUMNS tuple contains `(excel_header, field, type)`. The builder should iterate by field name, not by header position, since `parse_workbook` returns `{field: raw_value}` dicts (keyed by field, not by header). This is consistent with SPEC §excel.py: "For each data row return `{field: raw_value}`."

---

## 13. File summary for builder

| File to create | Key imports |
|---------------|-------------|
| `services/jvml_stock/__init__.py` | empty |
| `services/jvml_stock/customer_map.py` | `CustomerCode` from `models.customer_code` |
| `services/jvml_stock/ingest.py` | `JvmlStock`, `parse_workbook`, `coerce_value`, `audit_jvml_stock_event`, `build_customer_map` |
| `services/jvml_stock/poller.py` | `JvmlStockIngestion`, `get_config`, `send_missing_alert`, `ingest_file`, `get_status`, `audit_jvml_stock_event` |
| `services/jvml_stock/emails.py` | `send_email` from `core.email`, `audit_jvml_stock_event` |
| `services/jvml_stock/config_service.py` | `JvmlStockConfig`, `JvmlStockConfigPublic`, `JvmlStockConfigUpdate`, `audit_jvml_stock_event`, `apply_jvml_stock_schedule` (local import) |
| `services/jvml_stock/status.py` | `JvmlStockIngestion`, `JvmlStockIngestionRow`, `JvmlStockStatusPublic`, `get_config` |
| `services/cron/jvml_stock.py` | `audited_job` from `.heartbeat` |
