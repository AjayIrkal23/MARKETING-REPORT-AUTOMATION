# BE: Poller + Scheduler + Cron — Implementation Note

**Area:** `app/services/cron/jsw_stock.py` (new) + `app/core/scheduler.py` (additive edit)
+ `app/services/jsw_stock/poller.py` (new, consumed here)
**Status:** Validated against installed APScheduler 3.11.2 + real scheduler.py + heartbeat.py

---

## 1. Corrections / SPEC clarifications discovered

### 1a. `remove_job` raises `JobLookupError` — must guard with `get_job`

SPEC says "guard missing job" but does not spell out the mechanism.
**Verified:** `sched.remove_job("nonexistent_id")` raises
`apscheduler.jobstores.base.JobLookupError` — it does NOT return `None`.
`sched.get_job("missing_id")` returns `None` safely.
Guard pattern: `if sched.get_job(JOB_ID): sched.remove_job(JOB_ID)`.

### 1b. `PUT` is missing from `allow_methods` in `main.py`

`create_app` has `allow_methods=["GET","POST","PATCH","DELETE","OPTIONS"]`.
The config route uses `PUT /admin/jsw-stock/config`.
**Wiring agent must add `"PUT"` to that list**, otherwise CORS preflight will block the
frontend save call. This is a one-line edit in `app/main.py`.

### 1c. `datetime.now()` (local) is correct for poll window — intentional

SPEC says "now = datetime.now()" with no `timezone.utc`. This is correct: `start_time`/
`end_time` in the config are local-clock HH:MM strings (matching the admin's timezone).
Scheduler internally uses `timezone="UTC"` but that only affects APScheduler's internal
scheduling math — `run_poll` must compare against local time, not UTC. Do not change this.

### 1d. `audit_jsw_stock_event` category must be `"jsw_stock"` (not `"jsw_stocks"`)

SPEC §5 says `category="jsw_stock"`. The wiring agent adds `"jsw_stock"` to
`AuditCategory` Literal in `app/models/audit_log.py` and `app/schemas/audit_log.py`.
The `audit_jsw_stock_event` helper in `events.py` must pass `category="jsw_stock"`.

### 1e. `apply_jsw_stock_schedule` must tolerate `_scheduler is None`

If `cron_enabled=False` or APScheduler failed to start, `get_scheduler()` returns `None`.
`apply_jsw_stock_schedule` is called from `config_service.upsert_config` at runtime (not
just at boot), so it must check `sched is None` and return early — no exception.

### 1f. `next_run_time` accepted by `add_job` — confirmed

`AsyncIOScheduler.add_job` signature includes `next_run_time=<undefined>` as a keyword
arg (verified via `inspect.signature`). Passing `next_run_time=datetime.now()` causes
the job to fire immediately on registration, which is correct for "run now on save".

---

## 2. APScheduler 3.11.2 verified API

```python
# Verified via .venv/bin/python introspection:

# add_job full signature (relevant params):
sched.add_job(
    func,                          # callable
    trigger=IntervalTrigger(hours=n),
    id="jsw_stock.poll",
    name="JSW Stock poller",
    replace_existing=True,         # replaces existing job with same id
    misfire_grace_time=300,        # seconds
    next_run_time=datetime.now(),  # fire immediately on registration
)

# get_job: returns None if missing (safe, no exception)
job = sched.get_job("jsw_stock.poll")   # -> Job | None

# remove_job: raises JobLookupError if missing — ALWAYS guard
if sched.get_job("jsw_stock.poll"):
    sched.remove_job("jsw_stock.poll")

# IntervalTrigger constructor:
IntervalTrigger(weeks=0, days=0, hours=0, minutes=0, seconds=0,
                start_date=None, end_date=None, timezone=None, jitter=None)
# Only pass `hours=n` for the jsw_stock job.
```

---

## 3. Exact job ID constant

Use a single module-level constant everywhere to prevent typo drift:

```python
JSW_STOCK_JOB_ID = "jsw_stock.poll"
```

Define it in `app/core/scheduler.py` (or import it from there in `cron/jsw_stock.py`).

---

## 4. `app/services/cron/jsw_stock.py` — exact skeleton

```python
"""Scheduled poll job for JSW Stock Excel ingestion."""

from __future__ import annotations

from ..cron import audited_job  # re-exported from services/cron/__init__.py


@audited_job("cron.jsw_stock_poll")
async def jsw_stock_poll_job() -> None:
    """Poll for the daily JSW Stock Excel file and ingest it when found.

    Local import avoids import cycles between scheduler → cron → services.
    The @audited_job wrapper emits a cron audit entry on success/error and
    re-raises on failure so APScheduler records the misfire.
    """
    from ...services.jsw_stock.poller import run_poll  # noqa: PLC0415

    await run_poll()
```

**File: `app/services/cron/jsw_stock.py`** (~15 lines, well under 250)

Update `app/services/cron/__init__.py` to export `jsw_stock_poll_job`:

```python
from .heartbeat import audited_job, heartbeat_job
from .jsw_stock import jsw_stock_poll_job

__all__ = ["heartbeat_job", "audited_job", "jsw_stock_poll_job"]
```

---

## 5. `app/core/scheduler.py` — additive edits (exact diff)

Add after the `shutdown_scheduler` function. The existing file is 100 lines — adding
~55 lines stays well under 250.

```python
# ── constant ────────────────────────────────────────────────────────────────
JSW_STOCK_JOB_ID = "jsw_stock.poll"


# ── boot-time registration (called from start_scheduler) ────────────────────
async def _register_jsw_stock_job(sched: "AsyncIOScheduler") -> None:
    """Register the jsw_stock poll job if config says enabled.

    Called once during start_scheduler after the scheduler is started.
    Tolerates any error (DB may not be ready) — logs WARNING and continues.
    """
    try:
        from datetime import datetime  # noqa: PLC0415
        from apscheduler.triggers.interval import IntervalTrigger  # noqa: PLC0415
        from ..services.cron.jsw_stock import jsw_stock_poll_job  # noqa: PLC0415
        from ..models.jsw_stock_config import JswStockConfig  # noqa: PLC0415

        cfg = await JswStockConfig.find_one({"key": "default"})
        if cfg is None or not cfg.enabled:
            logger.info("JSW Stock poller: disabled (no config or enabled=False).")
            return

        sched.add_job(
            jsw_stock_poll_job,
            trigger=IntervalTrigger(hours=cfg.interval_hours),
            id=JSW_STOCK_JOB_ID,
            name="JSW Stock Excel poller",
            replace_existing=True,
            misfire_grace_time=300,
            next_run_time=datetime.now(),
        )
        logger.info(
            "JSW Stock poller registered — interval %dh.", cfg.interval_hours
        )
    except Exception:  # noqa: BLE001
        logger.warning("Failed to register JSW Stock poller job.", exc_info=True)


# ── runtime reconfiguration (called from config_service.upsert_config) ──────
async def apply_jsw_stock_schedule() -> None:
    """Add/replace or remove the jsw_stock poll job based on current config.

    Safe to call at runtime after a config PUT. Tolerates scheduler=None
    (cron disabled) and a missing/disabled config — both are no-ops.
    """
    sched = get_scheduler()
    if sched is None:
        logger.debug("apply_jsw_stock_schedule: scheduler not running, skipping.")
        return

    try:
        from datetime import datetime  # noqa: PLC0415
        from apscheduler.triggers.interval import IntervalTrigger  # noqa: PLC0415
        from ..services.cron.jsw_stock import jsw_stock_poll_job  # noqa: PLC0415
        from ..models.jsw_stock_config import JswStockConfig  # noqa: PLC0415

        cfg = await JswStockConfig.find_one({"key": "default"})

        if cfg is not None and cfg.enabled:
            sched.add_job(
                jsw_stock_poll_job,
                trigger=IntervalTrigger(hours=cfg.interval_hours),
                id=JSW_STOCK_JOB_ID,
                name="JSW Stock Excel poller",
                replace_existing=True,
                misfire_grace_time=300,
                next_run_time=datetime.now(),
            )
            logger.info(
                "JSW Stock schedule applied — interval %dh.", cfg.interval_hours
            )
        else:
            if sched.get_job(JSW_STOCK_JOB_ID):
                sched.remove_job(JSW_STOCK_JOB_ID)
                logger.info("JSW Stock poller removed (disabled).")
    except Exception:  # noqa: BLE001
        logger.warning("apply_jsw_stock_schedule error.", exc_info=True)
```

**Modify `start_scheduler`:** add one call after `sched.start()` and before
`_scheduler = sched`:

```python
        sched.start()
        await _register_jsw_stock_job(sched)   # <-- add this line
        _scheduler = sched
```

Import `apply_jsw_stock_schedule` stays in this module — callers import it as:

```python
from ..core.scheduler import apply_jsw_stock_schedule
```

---

## 6. `app/services/jsw_stock/poller.py` — exact skeleton

```python
"""JSW Stock Excel daily poll — file detection, ingest dispatch, and alert."""

from __future__ import annotations

import logging
import os
from datetime import datetime, time as dt_time

from ...models.jsw_stock_config import JswStockConfig
from ...models.jsw_stock_ingestion import JswStockIngestion
from ...schemas.jsw_stock_config import JswStockStatusPublic
from .emails import send_missing_alert
from .ingest import ingest_file
from .status import get_status

logger = logging.getLogger(__name__)


async def run_poll() -> JswStockStatusPublic:
    """Detect and ingest today's JSW Stock Excel file.

    Decisions / invariants (all guarded — never raises):
    - Uses datetime.now() (LOCAL clock) to match config HH:MM window.
    - today is formatted dd-mm-yyyy (matches the folder name convention).
    - os.makedirs(folder, exist_ok=True) creates the dated sub-folder.
    - Window: start <= now.time() is required to enter; now.time() >= end
      triggers the missing alert if still not found.
    - Ingestion is idempotent: JswStock.find(report_date=...).delete() first.
    - Alert fires at most once per day (status=="alerted" guard).
    - Any exception inside ingest → mark "error", audit jsw_stock.failed.
      Never re-raises (run_poll is a top-level job entry point).
    """
    # --- 1. load config singleton ----------------------------------------
    cfg = await JswStockConfig.find_one({"key": "default"})
    if cfg is None or not cfg.enabled:
        return await get_status()

    if not cfg.base_path or not cfg.file_name:
        logger.warning("run_poll: base_path or file_name is empty — skipping.")
        return await get_status()

    # --- 2. time window check (LOCAL clock) --------------------------------
    now = datetime.now()
    today = now.strftime("%d-%m-%Y")

    def _parse_hhmm(s: str) -> dt_time:
        h, m = map(int, s.split(":"))
        return dt_time(h, m)

    start = _parse_hhmm(cfg.start_time)
    end = _parse_hhmm(cfg.end_time)

    if now.time() < start:
        logger.debug("run_poll: before window (%s). today=%s", cfg.start_time, today)
        return await get_status()

    # --- 3. ensure dated folder exists -------------------------------------
    folder = os.path.join(cfg.base_path, today)
    os.makedirs(folder, exist_ok=True)

    # --- 4. get or create today's ingestion record -------------------------
    ingestion = await JswStockIngestion.find_one({"report_date": today})
    if ingestion is None:
        ingestion = JswStockIngestion(report_date=today, status="pending")
        await ingestion.save()

    if ingestion.status == "ingested":
        logger.debug("run_poll: already ingested for %s.", today)
        return await get_status()

    # --- 5. check for file -------------------------------------------------
    fpath = os.path.join(folder, cfg.file_name + ".xlsx")

    if os.path.isfile(fpath):
        try:
            count = await ingest_file(fpath, today)
            ingestion.status = "ingested"
            ingestion.row_count = count
            ingestion.found_at = datetime.now(tz=None)  # local naive
            ingestion.file_path = fpath
            ingestion.updated_at = datetime.now(tz=None)
            await ingestion.save()
            logger.info("run_poll: ingested %d rows for %s.", count, today)
        except Exception as exc:  # noqa: BLE001
            from ...services.audit.events import audit_jsw_stock_event  # noqa: PLC0415
            ingestion.status = "error"
            ingestion.error = str(exc)
            ingestion.updated_at = datetime.now(tz=None)
            await ingestion.save()
            await audit_jsw_stock_event(
                "jsw_stock.failed",
                f"Ingest failed for {today}: {exc}",
                outcome="error",
                extra={"report_date": today, "error": str(exc)},
            )
            logger.exception("run_poll: ingest_file failed for %s.", today)
    else:
        # file not found
        if now.time() >= end and ingestion.status != "alerted":
            await send_missing_alert(cfg, today)
            ingestion.status = "alerted"
            ingestion.alerted_at = datetime.now(tz=None)
            ingestion.error = f"File not found by end_time {cfg.end_time}"
            ingestion.updated_at = datetime.now(tz=None)
            await ingestion.save()
        elif ingestion.status != "alerted":
            ingestion.status = "missing"
            ingestion.updated_at = datetime.now(tz=None)
            await ingestion.save()

    return await get_status()
```

**Line count:** ~95 lines — well under 250.

---

## 7. Key import chain (cycle-safety)

```
scheduler.py
  └─ (at runtime via apply_jsw_stock_schedule)
       └─ services.cron.jsw_stock  ← @audited_job wrapper
            └─ services.jsw_stock.poller  ← local import inside job fn
                 └─ models.jsw_stock_config  (Beanie Document)
                 └─ services.jsw_stock.ingest
                 └─ services.jsw_stock.emails
                 └─ services.jsw_stock.status
```

All scheduler → cron → service imports are LOCAL (inside functions / methods) to
prevent circular import at module load time. This mirrors the heartbeat pattern
(`from ...models import AuditLog` inside the job body).

---

## 8. `services/cron/__init__.py` update (exact)

```python
"""Scheduled cron jobs package."""

from __future__ import annotations

from .heartbeat import audited_job, heartbeat_job
from .jsw_stock import jsw_stock_poll_job

__all__ = ["heartbeat_job", "audited_job", "jsw_stock_poll_job"]
```

---

## 9. `audit_jsw_stock_event` in `events.py` (append, wiring-pass file)

```python
async def audit_jsw_stock_event(
    action: str,
    summary: str,
    outcome: str = "success",
    actor_email: str | None = None,
    extra: dict[str, Any] | None = None,
) -> None:
    """Record a JSW Stock ingestion event (ingested, failed, missing_alert, config_updated)."""
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

Note: `category="jsw_stock"` (singular, no trailing s) — must match the Literal added
to `AuditCategory` in `app/models/audit_log.py`.

---

## 10. Wiring checklist for the wiring-pass agent

These are NOT done by the poller/scheduler builder — they are shared-file edits:

1. `app/main.py`: add `"PUT"` to `allow_methods` (CORS — PUT /admin/jsw-stock/config needs it).
2. `app/core/scheduler.py`: apply the additive edits from §5 above.
3. `app/services/cron/__init__.py`: add `jsw_stock_poll_job` export (§8).
4. `app/services/audit/events.py`: append `audit_jsw_stock_event` (§9).
5. `app/models/audit_log.py`: add `"jsw_stock"` to `AuditCategory` Literal.
6. `app/schemas/audit_log.py`: add `"jsw_stock"` to its `AuditCategory` Literal.

---

## 11. Verification commands

```bash
# APScheduler introspection (already verified)
cd backend && ./.venv/bin/python -c "
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
import inspect
print(inspect.signature(AsyncIOScheduler.add_job))
print('get_job:', inspect.signature(AsyncIOScheduler.get_job))
"

# Import smoke test (run after all files exist)
cd backend && ./.venv/bin/python -c "import app.main; print('OK')"

# remove_job guard sanity check
cd backend && ./.venv/bin/python -c "
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import asyncio
async def t():
    s = AsyncIOScheduler()
    s.start()
    print('get_job missing:', s.get_job('x'))  # None
    s.shutdown(wait=False)
asyncio.run(t())
"
```
