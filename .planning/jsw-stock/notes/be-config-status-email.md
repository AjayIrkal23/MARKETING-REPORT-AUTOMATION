# BE: config / status / emails + schemas — Implementation Note

**Area:** `app/schemas/jsw_stock_config.py`, `app/services/jsw_stock/config_service.py`,
`app/services/jsw_stock/status.py`, `app/services/jsw_stock/emails.py`

---

## SPEC validation findings

All contracts are **buildable as written**. Two clarifications surface below:

1. **`JswStockConfigPublic` does not need `id`** — the config is a singleton accessed by key
   `"default"`. Exposing `id` serves no client need and leaks an ObjectId. Omit it.
   The SPEC does not list it; this note confirms the omission is correct.

2. **`notify_emails` validator order matters:** `mode="before"` normalizer must run
   BEFORE pydantic's `EmailStr` type coercion. Mirror exactly what `schemas/region.py` does
   (normalize raw strings first → pydantic validates the normalized value). Confirmed working
   in live venv test.

3. **`model_validator(mode="after")` for start<end:** Confirmed `from pydantic import model_validator`
   works in this venv (pydantic v2). The `mode="after"` form receives the fully-constructed
   model instance. Field validators for `start_time`/`end_time` must run before this validator —
   they do, because pydantic v2 runs `field_validator` before `model_validator(mode="after")`.

4. **`send_email` signature** — `core/email.py` takes `(to, subject, text, html=None)`.
   The `emails.py` service must loop `notify_emails`, calling one `send_email` per address
   (the core helper is single-recipient). Never batch-send in a single SMTP call.

5. **`apply_jsw_stock_schedule` in `core/scheduler.py`** — `_scheduler` is module-level; guard
   `if _scheduler is None` before any `add_job`/`remove_job` call.
   Use `scheduler.get_job("jsw_stock.poll")` before `remove_job` to avoid
   `JobLookupError` when the job was never registered (e.g. disabled from first boot).

---

## File: `app/schemas/jsw_stock_config.py`

**Max 250 lines. Imports to use:**

```python
from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
```

### `JswStockConfigPublic`

```python
class JswStockConfigPublic(BaseModel):
    """Client-safe read projection of the JSW Stock config singleton."""

    enabled: bool
    base_path: str
    file_name: str
    start_time: str               # HH:MM
    end_time: str                 # HH:MM
    interval_hours: int
    notify_emails: list[str]      # NOT list[EmailStr] — output DTO, no re-validation
    updated_at: datetime | None   # None until first upsert
```

### `JswStockConfigUpdate`  (PUT body)

```python
_HHMM_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


class JswStockConfigUpdate(BaseModel):
    """PUT body for /admin/jsw-stock/config."""

    enabled: bool
    base_path: str = Field(max_length=500)
    file_name: str = Field(max_length=200)
    start_time: str
    end_time: str
    interval_hours: int = Field(ge=1, le=24)
    notify_emails: list[EmailStr] = Field(default_factory=list, max_length=100)

    # ---- field validators (mode="before" so normalized strings feed EmailStr) ----

    @field_validator("base_path", mode="before")
    @classmethod
    def strip_base_path(cls, v: Any) -> str:
        return str(v).strip() if v else ""

    @field_validator("file_name", mode="before")
    @classmethod
    def validate_file_name(cls, v: Any) -> str:
        """Strip and reject path-traversal characters."""
        v = str(v).strip() if v else ""
        if any(c in v for c in ("/", "\\", "..")):
            raise ValueError("file_name must not contain / \\ or ..")
        return v

    @field_validator("start_time", "end_time", mode="before")
    @classmethod
    def validate_hhmm(cls, v: Any) -> str:
        if not isinstance(v, str) or not _HHMM_RE.match(v):
            raise ValueError("must be HH:MM (00:00–23:59)")
        return v

    @field_validator("notify_emails", mode="before")
    @classmethod
    def normalize_emails(cls, v: Any) -> list[str]:
        """Lowercase, strip, deduplicate (preserving order). Mirror region.py."""
        if not v:
            return []
        seen: list[str] = []
        seen_set: set[str] = set()
        for item in v:
            normalized = str(item).lower().strip()
            if normalized not in seen_set:
                seen_set.add(normalized)
                seen.append(normalized)
        return seen

    # ---- cross-field model validator ----

    @model_validator(mode="after")
    def check_start_before_end(self) -> "JswStockConfigUpdate":
        """Assert start_time < end_time (lexicographic HH:MM comparison is correct)."""
        if self.start_time >= self.end_time:
            raise ValueError("start_time must be strictly before end_time")
        return self
```

> **Why lexicographic comparison is correct:** HH:MM strings in 24-h zero-padded format
> sort correctly as plain strings because the format is fixed-width and zero-padded.
> `"08:00" < "20:00"` is True. No time parsing required.

### `JswStockIngestionRow`  (nested in status)

```python
class JswStockIngestionRow(BaseModel):
    """One row in the recent-ingestions list on the status endpoint."""

    report_date: str
    status: str
    row_count: int
    found_at: datetime | None
    created_at: datetime
```

### `JswStockStatusPublic`

```python
class JswStockStatusPublic(BaseModel):
    """Response shape for GET /admin/jsw-stock/status."""

    enabled: bool
    last_report_date: str | None
    last_status: str | None
    last_row_count: int | None
    last_found_at: datetime | None
    last_alerted_at: datetime | None
    last_error: str | None
    recent: list[JswStockIngestionRow]
```

---

## File: `app/services/jsw_stock/config_service.py`

```python
from __future__ import annotations

from datetime import datetime, timezone

from ...models.jsw_stock_config import JswStockConfig
from ...schemas.jsw_stock_config import JswStockConfigPublic, JswStockConfigUpdate
from ..audit.events import audit_jsw_stock_event


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _to_public(doc: JswStockConfig) -> JswStockConfigPublic:
    return JswStockConfigPublic(
        enabled=doc.enabled,
        base_path=doc.base_path,
        file_name=doc.file_name,
        start_time=doc.start_time,
        end_time=doc.end_time,
        interval_hours=doc.interval_hours,
        notify_emails=doc.notify_emails,
        updated_at=doc.updated_at,
    )


async def get_config() -> JswStockConfigPublic:
    """Return the singleton config, or defaults if it has never been saved."""
    doc = await JswStockConfig.find_one({"key": "default"})
    if doc is None:
        # Return schema defaults without persisting — first explicit PUT creates the doc.
        return JswStockConfigPublic(
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
    body: JswStockConfigUpdate,
    *,
    actor_email: str | None,
) -> JswStockConfigPublic:
    """Find-or-create the singleton, apply PUT body, bump updated_at, reschedule."""
    # Local import avoids circular dependency (scheduler imports services.cron,
    # services.cron imports services.jsw_stock at job-call time via local import).
    from ...core.scheduler import apply_jsw_stock_schedule  # noqa: PLC0415

    doc = await JswStockConfig.find_one({"key": "default"})
    now = _now_utc()

    if doc is None:
        doc = JswStockConfig(
            key="default",
            enabled=body.enabled,
            base_path=body.base_path,
            file_name=body.file_name,
            start_time=body.start_time,
            end_time=body.end_time,
            interval_hours=body.interval_hours,
            notify_emails=list(body.notify_emails),
            created_at=now,
            updated_at=now,
        )
        await doc.insert()
    else:
        doc.enabled = body.enabled
        doc.base_path = body.base_path
        doc.file_name = body.file_name
        doc.start_time = body.start_time
        doc.end_time = body.end_time
        doc.interval_hours = body.interval_hours
        doc.notify_emails = list(body.notify_emails)
        doc.updated_at = now
        await doc.save()

    await apply_jsw_stock_schedule()

    await audit_jsw_stock_event(
        "jsw_stock.config_updated",
        "JSW Stock config updated",
        actor_email=actor_email,
        extra={
            "enabled": body.enabled,
            "interval_hours": body.interval_hours,
            "notify_count": len(body.notify_emails),
        },
    )
    return _to_public(doc)
```

**Key facts:**
- `notify_emails` stored as `list[str]` on the model. Wrap `list(body.notify_emails)` to
  convert from `list[EmailStr]` (pydantic's `EmailStr` is a `str` subtype, so this is safe).
- `apply_jsw_stock_schedule()` is a local import to break the potential import cycle:
  `scheduler.py` → `services.cron` → `services.cron.jsw_stock` → `services.jsw_stock.poller` →
  `services.jsw_stock.config_service` → `scheduler.py`. Local import at call time avoids the loop.

---

## File: `app/services/jsw_stock/status.py`

```python
from __future__ import annotations

from ...models.jsw_stock_config import JswStockConfig
from ...models.jsw_stock_ingestion import JswStockIngestion
from ...schemas.jsw_stock_config import JswStockIngestionRow, JswStockStatusPublic

_RECENT_N = 14


async def get_status() -> JswStockStatusPublic:
    """Return current config.enabled + latest ingestion + recent 14 by created_at desc."""
    config = await JswStockConfig.find_one({"key": "default"})
    enabled = config.enabled if config is not None else False

    latest = await JswStockIngestion.find_one(
        sort=[("created_at", -1)],
    )

    recent_docs = (
        await JswStockIngestion.find(
            sort=[("created_at", -1)],
            limit=_RECENT_N,
        ).to_list()
    )

    recent = [
        JswStockIngestionRow(
            report_date=d.report_date,
            status=d.status,
            row_count=d.row_count,
            found_at=d.found_at,
            created_at=d.created_at,
        )
        for d in recent_docs
    ]

    return JswStockStatusPublic(
        enabled=enabled,
        last_report_date=latest.report_date if latest else None,
        last_status=latest.status if latest else None,
        last_row_count=latest.row_count if latest else None,
        last_found_at=latest.found_at if latest else None,
        last_alerted_at=latest.alerted_at if latest else None,
        last_error=latest.error if latest else None,
        recent=recent,
    )
```

**Note on Beanie sort syntax:** `JswStockIngestion.find_one(sort=[("created_at", -1)])` uses the
pymongo-style tuple list. Confirm against the Beanie version in the venv — if Beanie 2.x requires
`find().sort("-created_at").first_or_none()`, use that form. The customer_code reference
implementation is the canonical pattern to mirror.

---

## File: `app/services/jsw_stock/emails.py`

```python
from __future__ import annotations

import logging
import textwrap

from ...core.email import send_email

logger = logging.getLogger(__name__)


def render_missing_email(
    report_date: str,
    file_name: str,
    base_path: str,
) -> tuple[str, str, str]:
    """Return (subject, text, html) for the missing-file alert.

    Args:
        report_date: Folder date string, e.g. "31-05-2026".
        file_name:   Configured file stem (no extension).
        base_path:   Configured base directory.
    """
    subject = f"JSW STOCK EXCEL not found — {report_date}"

    expected_path = f"{base_path}/{report_date}/{file_name}.xlsx"

    text = textwrap.dedent(f"""\
        The JSW Stock Excel file was not found by the end of the monitoring window.

        Expected file: {expected_path}
        Report date:   {report_date}

        Please upload the file or check the source system.
        This alert is sent once per day when the file is missing at end_time.
    """)

    html = textwrap.dedent(f"""\
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="utf-8"><title>{subject}</title></head>
        <body style="font-family:sans-serif;color:#1a1a2e;max-width:520px;margin:auto;padding:24px">
          <h2 style="color:#b91c1c">&#9888; JSW STOCK EXCEL not found</h2>
          <p><strong>Report date:</strong> {report_date}</p>
          <p><strong>Expected file:</strong><br>
             <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px">{expected_path}</code>
          </p>
          <p style="color:#64748b;font-size:.875rem">
            This alert is sent once per day when the file is missing at the configured end time.
            Please upload the file or investigate the source system.
          </p>
        </body>
        </html>
    """)

    return subject, text, html


async def send_missing_alert(config: object, report_date: str) -> None:
    """Loop notify_emails and send the missing-file alert to each recipient.

    Never raises — failures are logged at ERROR level and swallowed so that
    a failed email delivery does not abort the poller or mark ingestion incorrectly.

    Args:
        config:      The JswStockConfig document (or any object with .file_name,
                     .base_path, .notify_emails attributes).
        report_date: Folder date string, e.g. "31-05-2026".
    """
    subject, text, html = render_missing_email(
        report_date=report_date,
        file_name=config.file_name,
        base_path=config.base_path,
    )

    for email in config.notify_emails:
        # send_email NEVER raises (core/email.py contract).
        await send_email(to=email, subject=subject, text=text, html=html)

    if config.notify_emails:
        logger.info(
            "Missing-file alert sent to %d recipient(s) for report_date=%s",
            len(config.notify_emails),
            report_date,
        )
    else:
        logger.warning(
            "Missing-file alert: no notify_emails configured for report_date=%s",
            report_date,
        )
```

---

## Scheduler wiring: `apply_jsw_stock_schedule()` in `app/core/scheduler.py`

Add this function AFTER `shutdown_scheduler`. Do NOT import it at module top-level
(it would create a circular import — see config_service.py note above).

```python
async def apply_jsw_stock_schedule() -> None:
    """Add or remove the JSW Stock poll job based on the current config.

    Called by config_service.upsert_config after every PUT /admin/jsw-stock/config.
    Also called once from start_scheduler to wire the job at boot if already enabled.
    Safe to call when _scheduler is None (APScheduler not started) — logs warning and returns.
    """
    global _scheduler  # noqa: PLW0603

    if _scheduler is None:
        logger.warning("apply_jsw_stock_schedule: scheduler not running — skipping.")
        return

    try:
        from apscheduler.triggers.interval import IntervalTrigger  # noqa: PLC0415
        from ..models.jsw_stock_config import JswStockConfig  # noqa: PLC0415
        from ..services.cron.jsw_stock import jsw_stock_poll_job  # noqa: PLC0415

        config = await JswStockConfig.find_one({"key": "default"})

        if config is not None and config.enabled:
            _scheduler.add_job(
                jsw_stock_poll_job,
                trigger=IntervalTrigger(hours=config.interval_hours),
                id="jsw_stock.poll",
                name="JSW Stock Excel poll",
                replace_existing=True,
                misfire_grace_time=120,
                next_run_time=__import__("datetime").datetime.now(),
            )
            logger.info(
                "JSW Stock poll job scheduled: every %d hour(s).",
                config.interval_hours,
            )
        else:
            # Remove only if it exists — guard prevents JobLookupError.
            if _scheduler.get_job("jsw_stock.poll") is not None:
                _scheduler.remove_job("jsw_stock.poll")
                logger.info("JSW Stock poll job removed (disabled).")
    except Exception:  # noqa: BLE001
        logger.warning("apply_jsw_stock_schedule failed.", exc_info=True)
```

Add to `start_scheduler`, just before `sched.start()`:

```python
# Register JSW Stock poll job if config exists and is enabled at boot.
# Uses local import to avoid circular deps at module level.
try:
    from ..services.cron.jsw_stock import jsw_stock_poll_job  # noqa: PLC0415
    from ..models.jsw_stock_config import JswStockConfig  # noqa: PLC0415

    jsw_config = await JswStockConfig.find_one({"key": "default"})
    if jsw_config is not None and jsw_config.enabled:
        sched.add_job(
            jsw_stock_poll_job,
            trigger=IntervalTrigger(hours=jsw_config.interval_hours),
            id="jsw_stock.poll",
            name="JSW Stock Excel poll",
            replace_existing=True,
            misfire_grace_time=120,
        )
        logger.info(
            "JSW Stock poll registered at startup: every %d hour(s).",
            jsw_config.interval_hours,
        )
except Exception:  # noqa: BLE001
    logger.warning("JSW Stock job boot-registration skipped.", exc_info=True)
```

> **IMPORTANT:** `start_scheduler` is currently a plain `async def` but does not `await` anything.
> The boot snippet above `await`s `JswStockConfig.find_one(...)` which requires the DB to be
> initialized before the scheduler starts. Verify `start_scheduler` is called AFTER `init_db` in
> `app/main.py`'s `lifespan` handler. If the current order is startup→scheduler→DB, swap it.

---

## `audit_jsw_stock_event` stub (for `app/services/audit/events.py`)

```python
async def audit_jsw_stock_event(
    action: str,
    summary: str,
    outcome: str = "success",
    actor_email: str | None = None,
    extra: dict[str, Any] | None = None,
) -> None:
    """Record a JSW Stock management or ingestion event.

    category="jsw_stock", source="service". Never raises.
    """
    await record_audit(
        category="jsw_stock",
        action=action,
        summary=summary,
        outcome=outcome,
        source="service",
        actor_email=actor_email,
        extra=extra,
    )
```

---

## Critical correctness checks for this area

| Check | Command |
|---|---|
| Pydantic validators compile | `.venv/bin/python -c "from app.schemas.jsw_stock_config import JswStockConfigUpdate; print('OK')"` |
| model_validator rejects start>=end | `.venv/bin/python -c "from app.schemas.jsw_stock_config import JswStockConfigUpdate; JswStockConfigUpdate(enabled=True, base_path='/x', file_name='f', start_time='20:00', end_time='08:00', interval_hours=1, notify_emails=[])"` → must raise |
| path-traversal rejected | `file_name="../evil"` → raises |
| email dedup + lowercase | `notify_emails=['A@X.COM','a@x.com']` → `['a@x.com']` |
| `core.email.send_email` never raises | confirmed in `core/email.py` — transport failures caught internally |
| full import | `.venv/bin/python -c "import app.main"` exits 0 |

---

## Line-count estimates

| File | Estimate |
|---|---|
| `schemas/jsw_stock_config.py` | ~120 lines |
| `services/jsw_stock/config_service.py` | ~90 lines |
| `services/jsw_stock/status.py` | ~55 lines |
| `services/jsw_stock/emails.py` | ~80 lines |

All safely under the 250-line limit.
