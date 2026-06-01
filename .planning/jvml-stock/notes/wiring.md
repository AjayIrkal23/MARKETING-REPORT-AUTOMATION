# JVML Stock — Shared-File Wiring Map (Orchestrator Checklist)

> READ-ONLY analysis. All edits described here are APPEND-ONLY and must be
> applied by the ORCHESTRATOR in a single serialized pass. The concurrent JSW
> Stock session touches the same shared files — every insertion point below is
> chosen to be non-colliding (additive imports, list appends, new route
> includes). The orchestrator must re-read each file immediately before editing
> it in case the JSW session has already mutated it.

---

## SPEC MISMATCHES FOUND

**MISMATCH 1 — audit_jvml_stock_event category value.**
SPEC §4 bullet 6 says: add `audit_jvml_stock_event` with `category="jvml_stock"`.
But the real `audit_customer_code_event` uses `category="customer_codes"` (plural,
underscore-separated), and the `AuditCategory` Literal in both
`models/audit_log.py` and `schemas/audit_log.py` lists `"customer_codes"` (not
`"customer_code"` singular). The SPEC also requires adding `"jvml_stock"` to that
Literal — so the category value for the new event function **must be `"jvml_stock"`**
(consistent with what SPEC §4 items 3–5 add to the Literal). This is internally
consistent; just note that the audit category is `"jvml_stock"` (singular, not
`"jvml_stocks"`).

**MISMATCH 2 — `putData` already absent from client.ts (expected, not a collision).**
Confirmed: `client.ts` currently exports `getData, postData, patchData, deleteData,
getList, buildQuery`. There is NO `putData`. SPEC §4 item 9 correctly identifies
this as needing to be added. The JSW session will also need `putData` — both
sessions must NOT independently add it. The ORCHESTRATOR must add it once; both
sessions' builders have been told to assume it exists.

**MISMATCH 3 — `AuditCategoryBadge.tsx` uses `as const satisfies Record<...>` map.**
The CATEGORY_MAP type is `as const satisfies Record<string, { label: string; className: string }>`.
Adding `"jvml_stock"` as a key requires the orchestrator to insert a new entry into
CATEGORY_MAP. The `AuditCategoryBadgeProps` type in `types/admin/audit-log-ui.ts`
likely has `category: AuditCategory` — after adding `"jvml_stock"` to `AuditCategory`
in `types/admin/audit-log.ts`, the badge map must also be extended or TypeScript will
error at the `satisfies` check. Orchestrator must update both files atomically.

**MISMATCH 4 — `services/cron/__init__.py` does NOT export `audited_job` separately.**
Wait — it does: `from .heartbeat import audited_job, heartbeat_job`. But the new
`services/cron/jvml_stock.py` cron file should import `audited_job` from
`..services.cron` (relative: `from .decorators import audited_job` as SPEC §2
writes — but there is NO `decorators.py`). The real module is `heartbeat.py`
which exports both. **SPEC §2 has an error**: `from .decorators import audited_job`
should be `from . import audited_job` (or `from .heartbeat import audited_job`).
The `__init__.py` re-exports it, so `from . import audited_job` is correct.

---

## 1. `backend/app/models/__init__.py`

**Current last line (line 8):**
```python
__all__ = ["AuditLog", "CustomerCode", "Region", "User"]
```

**Anchor line (unique):** `from .user import User`

**Exact edit — append after `from .user import User`:**
```python
from .jvml_stock import JvmlStock
from .jvml_stock_config import JvmlStockConfig
from .jvml_stock_ingestion import JvmlStockIngestion
```

**And replace `__all__` line:**

Old:
```python
__all__ = ["AuditLog", "CustomerCode", "Region", "User"]
```
New (append-only style — add 3 names before closing bracket):
```python
__all__ = ["AuditLog", "CustomerCode", "JvmlStock", "JvmlStockConfig", "JvmlStockIngestion", "Region", "User"]
```

**Collision note:** JSW session will add `JswStock`, `JswStockConfig`, `JswStockIngestion`
to the same file. Both sessions insert AFTER the existing domain imports, before `__all__`.
Orchestrator must apply both sessions' imports in the same pass and merge `__all__` once.
Recommended: alphabetical order within `__all__` avoids conflicts.

---

## 2. `backend/app/core/database.py`

**Anchor line (unique, line 16):**
```python
from ..models import AuditLog, CustomerCode, Region, User
```

**Edit 1 — expand the import (replace the import line):**
```python
from ..models import AuditLog, CustomerCode, JvmlStock, JvmlStockConfig, JvmlStockIngestion, Region, User
```

**Edit 2 — DOCUMENT_MODELS list (current line 19):**
```python
DOCUMENT_MODELS = [User, AuditLog, CustomerCode, Region]
```
Replace with:
```python
DOCUMENT_MODELS = [User, AuditLog, CustomerCode, Region, JvmlStock, JvmlStockConfig, JvmlStockIngestion]
```

**Collision note:** JSW session adds `JswStock, JswStockConfig, JswStockIngestion`.
Orchestrator merges both into a single import line and single DOCUMENT_MODELS list
in one serialized edit. Append all new models after `Region`.

---

## 3. `backend/app/routes/__init__.py`

**Current from-import line (line 7):**
```python
from . import admin_user, audit_log, auth, customer_code, meta, region, user
```

**Edit — replace that line (extend the import):**
```python
from . import admin_user, audit_log, auth, customer_code, jvml_stock, meta, region, user
```

**Anchor for router includes — current last include (line 16):**
```python
api_router.include_router(customer_code.router)
```

**Append after that line:**
```python
api_router.include_router(jvml_stock.router)
api_router.include_router(jvml_stock.config_router)
```

**Collision note:** JSW session adds `jsw_stock` to the same import line and appends
`jsw_stock.router` + `jsw_stock.config_router`. Orchestrator must merge both domain
names into the `from . import ...` line alphabetically and append both sets of
`include_router` calls. Final from-import will be something like:
```python
from . import admin_user, audit_log, auth, customer_code, jvml_stock, jsw_stock, meta, region, user
```

---

## 4. `backend/app/services/audit/events.py`

**File is 194 lines. Last function ends at line 194.**

**Anchor (last line of file):**
```python
        extra=extra,
    )
```
(This is the closing of `audit_customer_code_event`.)

**Append at end of file (after line 194):**
```python


async def audit_jvml_stock_event(
    action: str,
    summary: str,
    outcome: str = "success",
    actor_email: str | None = None,
    extra: dict[str, Any] | None = None,
) -> None:
    """Record a JVML stock ingestion/config event (ingested, failed, missing_alert, config_updated).

    Args:
        action:      Dot-namespaced identifier, e.g. ``"jvml_stock.ingested"``.
        summary:     Human-readable description.
        outcome:     ``"success"`` | ``"failure"`` | ``"error"``; defaults to ``"success"``.
        actor_email: Actor email when triggered by an admin action; ``None`` for cron/system.
        extra:       Arbitrary extra context (report_date, row_count, file_path, etc.).
    """
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

**Import in builder files:** `from app.services.audit.events import audit_jvml_stock_event`

**Collision note:** JSW session appends `audit_jsw_stock_event` to the same file.
Both are pure appends with two blank lines separating them — no collision risk as
long as the orchestrator applies them sequentially.

---

## 5. `backend/app/models/audit_log.py`

**Current `AuditCategory` Literal (line 19):**
```python
AuditCategory = Literal["http", "auth", "admin", "data", "system", "cron", "security", "regions", "customer_codes"]
```

**Replace with (add `"jvml_stock"` before closing paren):**
```python
AuditCategory = Literal["http", "auth", "admin", "data", "system", "cron", "security", "regions", "customer_codes", "jvml_stock"]
```

**Collision note:** JSW session adds `"jsw_stock"` to the same Literal. Orchestrator
merges both in one edit:
```python
AuditCategory = Literal["http", "auth", "admin", "data", "system", "cron", "security", "regions", "customer_codes", "jvml_stock", "jsw_stock"]
```

---

## 6. `backend/app/schemas/audit_log.py`

**Current `AuditCategory` Literal (line 23):**
```python
AuditCategory = Literal["http", "auth", "admin", "data", "system", "cron", "security", "regions", "customer_codes"]
```

**Replace with:**
```python
AuditCategory = Literal["http", "auth", "admin", "data", "system", "cron", "security", "regions", "customer_codes", "jvml_stock"]
```

**Collision note:** Same merge needed as item 5. Both Literals (model + schema) must
stay identical — orchestrator updates both atomically.

---

## 7. `backend/app/services/audit_log/options.py`

**Current `_CATEGORIES` list (line 31):**
```python
_CATEGORIES: list[str] = ["http", "auth", "admin", "data", "system", "cron", "security", "regions", "customer_codes"]
```

**Replace with:**
```python
_CATEGORIES: list[str] = ["http", "auth", "admin", "data", "system", "cron", "security", "regions", "customer_codes", "jvml_stock"]
```

**Collision note:** JSW session adds `"jsw_stock"`. Final merged form:
```python
_CATEGORIES: list[str] = ["http", "auth", "admin", "data", "system", "cron", "security", "regions", "customer_codes", "jvml_stock", "jsw_stock"]
```

**Important:** `_CATEGORIES` feeds `AuditFacets.categories` returned to the FE.
Must stay in sync with the two Literal definitions above.

---

## 8. `backend/app/core/scheduler.py`

**Current file is 99 lines. Two insertion points needed.**

### 8a. New `apply_jvml_stock_schedule()` function

**Anchor — insert BEFORE `async def start_scheduler()` (line 38). Add after `get_scheduler` function ends (line 35):**

```python

def apply_jvml_stock_schedule() -> None:
    """Register or remove the JVML stock poll job based on current config.

    Called by ``jvml_stock.config_service.upsert_config`` after every save.
    Tolerates scheduler being None (not started) or Mongo being unreachable.
    Uses a sync asyncio.run wrapper so it is callable from sync service code.
    """
    import asyncio  # noqa: PLC0415

    sched = get_scheduler()
    if sched is None:
        return

    try:
        from apscheduler.triggers.interval import IntervalTrigger  # noqa: PLC0415

        from ..services.jvml_stock.config_service import get_config_sync  # noqa: PLC0415

        cfg = get_config_sync()  # sync helper — see note below
        if cfg.enabled:
            from ..services.cron.jvml_stock import jvml_stock_poll_job  # noqa: PLC0415

            sched.add_job(
                jvml_stock_poll_job,
                trigger=IntervalTrigger(hours=cfg.interval_hours),
                id="jvml_stock.poll",
                name="JVML Stock poll",
                replace_existing=True,
                next_run_time=__import__("datetime").datetime.now(),
                misfire_grace_time=300,
            )
            logger.info("JVML stock poll job scheduled (every %dh).", cfg.interval_hours)
        else:
            try:
                sched.remove_job("jvml_stock.poll")
                logger.info("JVML stock poll job removed (disabled).")
            except Exception:  # noqa: BLE001
                pass  # job was not registered — harmless
    except Exception:  # noqa: BLE001
        logger.warning("apply_jvml_stock_schedule failed.", exc_info=True)
```

**NOTE on `get_config_sync`:** `apply_jvml_stock_schedule` is called from a sync
context (after an async `upsert_config` returns). The SPEC says "sync wrapper or via
a small async runner". The cleanest pattern is:

```python
# In services/jvml_stock/config_service.py — add a sync helper:
def get_config_sync() -> JvmlStockConfigPublic:
    import asyncio  # noqa: PLC0415
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # Called inside an async context — should not happen, but guard it
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                return pool.submit(asyncio.run, get_config()).result()
        return loop.run_until_complete(get_config())
    except RuntimeError:
        return asyncio.run(get_config())
```

Alternatively, make `apply_jvml_stock_schedule` an `async def` and await it directly
inside `upsert_config` (simpler — recommended):

```python
# In config_service.py upsert_config:
async def upsert_config(body, *, actor_email) -> JvmlStockConfigPublic:
    ...  # save, bump updated_at
    await _apply_schedule_async()  # inline async call — no sync wrapper needed
    ...
```

```python
# In scheduler.py — async version (simpler):
async def apply_jvml_stock_schedule() -> None:
    from apscheduler.triggers.interval import IntervalTrigger  # noqa: PLC0415
    from ..services.jvml_stock.config_service import get_config  # noqa: PLC0415

    sched = get_scheduler()
    if sched is None:
        return
    try:
        cfg = await get_config()
        if cfg.enabled:
            from ..services.cron.jvml_stock import jvml_stock_poll_job  # noqa: PLC0415
            sched.add_job(
                jvml_stock_poll_job,
                trigger=IntervalTrigger(hours=cfg.interval_hours),
                id="jvml_stock.poll",
                name="JVML Stock poll",
                replace_existing=True,
                next_run_time=__import__("datetime").datetime.now(),
                misfire_grace_time=300,
            )
        else:
            try:
                sched.remove_job("jvml_stock.poll")
            except Exception:  # noqa: BLE001
                pass
    except Exception:  # noqa: BLE001
        logger.warning("apply_jvml_stock_schedule failed.", exc_info=True)
```

**Recommended: use the async version** — `upsert_config` is already async so
`await apply_jvml_stock_schedule()` is natural. Expose from `app.core.scheduler`.

### 8b. Best-effort registration in `start_scheduler`

**Anchor — current last line of the `try` block in `start_scheduler` (line 74):**
```python
        logger.info(
            "Scheduler started — heartbeat every %d minute(s).",
            settings.audit_heartbeat_minutes,
        )
```

**Append inside the same `try` block, after the `logger.info(...)` call:**
```python
        # Best-effort: register JVML stock poll if config is already enabled.
        try:
            await apply_jvml_stock_schedule()
        except Exception:  # noqa: BLE001
            logger.warning("Could not pre-register JVML stock job at startup.", exc_info=True)
```

**Collision note:** JSW session inserts an analogous `apply_jsw_stock_schedule()` call
in the same `try` block. Both are independent `try/except` blocks appended after the
heartbeat log line — no collision.

### 8c. `services/cron/jvml_stock.py` — correct import (SPEC mismatch fix)

SPEC §2 writes `from .decorators import audited_job` — **this module does not exist**.
The correct import is:

```python
# backend/app/services/cron/jvml_stock.py  (NEW file — builder creates this)
from __future__ import annotations

from . import audited_job  # re-exported by services/cron/__init__.py from .heartbeat


@audited_job("cron.jvml_stock_poll")
async def jvml_stock_poll_job() -> None:
    from ...services.jvml_stock.poller import run_poll  # local import avoids cycles
    await run_poll()
```

And expose from `services/cron/__init__.py`:
```python
# append to existing __all__ and add import:
from .jvml_stock import jvml_stock_poll_job
__all__ = ["heartbeat_job", "audited_job", "jvml_stock_poll_job"]
```

---

## 9. `frontend/src/api/client.ts`

**`putData` is ABSENT — must be added.**

**Anchor — unique string in file (line 71):**
```typescript
/** PATCH a JSON body and unwrap `data`. */
export async function patchData<T>(path: string, body: unknown): Promise<T> {
  return (await request<T>(path, { method: "PATCH", body: JSON.stringify(body) })).data
}
```

**Insert immediately AFTER the `patchData` block (before `deleteData`):**
```typescript

/** PUT a JSON body and unwrap `data`. */
export async function putData<T>(path: string, body: unknown): Promise<T> {
  return (await request<T>(path, { method: "PUT", body: JSON.stringify(body) })).data
}
```

**Collision note:** JSW session also needs `putData`. Orchestrator adds it once.
The `putData` signature mirrors `patchData` exactly (only `method` differs).

---

## 10. `frontend/src/components/layout/nav-items.ts`

### 10a. Add `Boxes` import

**Current import line (line 2):**
```typescript
import { Building2, LayoutDashboard, MapPin, ScrollText, UsersRound } from "lucide-react"
```

**Replace with (add `Boxes` and `Settings`):**
```typescript
import { Boxes, Building2, LayoutDashboard, MapPin, ScrollText, Settings, UsersRound } from "lucide-react"
```

**Collision note:** JSW session also needs `Boxes` (same icon for its nav entry).
Both sessions add `Boxes`. Orchestrator deduplicates — `Boxes` appears once in the
import. `Settings` is for ADMIN_NAV_ITEMS Settings entry.

### 10b. Add JVML Stock to `NAV_ITEMS`

**Current `NAV_ITEMS` (line 11–13):**
```typescript
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/home", icon: LayoutDashboard },
]
```

**Replace with:**
```typescript
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/home", icon: LayoutDashboard },
  { label: "JVML Stock List", to: "/jvml-stock", icon: Boxes },
]
```

**Collision note:** JSW session adds `{ label: "JSW Stock List", to: "/jsw-stock", icon: Boxes }`.
Final merged NAV_ITEMS:
```typescript
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/home", icon: LayoutDashboard },
  { label: "JVML Stock List", to: "/jvml-stock", icon: Boxes },
  { label: "JSW Stock List", to: "/jsw-stock", icon: Boxes },
]
```
Order: JVML before JSW (alphabetical). Orchestrator merges both in one edit.

### 10c. Add Settings to `ADMIN_NAV_ITEMS`

**Current `ADMIN_NAV_ITEMS` (lines 15–20):**
```typescript
export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "User Management", to: "/admin/users", icon: UsersRound },
  { label: "Audit Logs", to: "/admin/audit-logs", icon: ScrollText },
  { label: "Region Management", to: "/admin/regions", icon: MapPin },
  { label: "Customer Codes", to: "/admin/customer-codes", icon: Building2 },
]
```

**Append inside array before closing `]`:**
```typescript
  { label: "Settings", to: "/admin/settings", icon: Settings },
```

**Final ADMIN_NAV_ITEMS:**
```typescript
export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "User Management", to: "/admin/users", icon: UsersRound },
  { label: "Audit Logs", to: "/admin/audit-logs", icon: ScrollText },
  { label: "Region Management", to: "/admin/regions", icon: MapPin },
  { label: "Customer Codes", to: "/admin/customer-codes", icon: Building2 },
  { label: "Settings", to: "/admin/settings", icon: Settings },
]
```

**Collision note:** JSW session also adds the Settings entry. Orchestrator adds it
once (idempotent check: if Settings entry already present from JSW pass, skip).

---

## 11. `frontend/src/App.tsx`

### 11a. Lazy import

**Current last import (line 12):**
```typescript
import { CustomerCodeManagementPage } from "@/pages/admin/customer-codes"
```

**Insert after line 12:**
```typescript
import { lazy, Suspense } from "react"

const JvmlStockListPage = lazy(() => import("@/pages/jvml-stock"))
const SettingsPage = lazy(() => import("@/pages/admin/settings"))
```

**NOTE:** If App.tsx already uses `lazy/Suspense` (check after JSW pass), only add
the lazy import lines for the new pages. The `lazy` + `Suspense` import may already
exist after JSW session runs. Orchestrator must re-read before editing.

Alternatively, use a **non-lazy static import** (consistent with the existing eager
import pattern in the file — all current imports are static, non-lazy):

```typescript
import { JvmlStockListPage } from "@/pages/jvml-stock"
import { SettingsPage } from "@/pages/admin/settings"
```

**Recommended: match the existing eager import pattern.** All current page imports
are static (`import { X } from "@/pages/..."`). Use eager imports for consistency
unless the bundle is a concern.

### 11b. `/jvml-stock` route — inside ProtectedRoute + DashboardLayout, OUTSIDE AdminRoute

**Anchor (unique, line 25):**
```typescript
            <Route path="/home" element={<HomePage />} />
```

**Insert after that line (before `<Route element={<AdminRoute />}>`):**
```typescript
            <Route path="/jvml-stock" element={<JvmlStockListPage />} />
```

**This is NOT inside AdminRoute** — all authenticated users can access it (SPEC §0
capability 3: "all authenticated users").

### 11c. `/admin/settings` route — inside AdminRoute group

**Anchor (unique, line 31):**
```typescript
              <Route path="/admin/customer-codes" element={<CustomerCodeManagementPage />} />
```

**Append inside `<AdminRoute>` group, after that line:**
```typescript
              <Route path="/admin/settings" element={<SettingsPage />} />
```

**Collision note:** JSW session adds the same `/admin/settings` route (same
`SettingsPage`). Orchestrator adds it once.

**Full App.tsx after all wiring (for reference):**
```tsx
import { lazy } from "react"  // add if not present
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import { AuthBootstrap } from "@/components/auth/AuthBootstrap"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { ProtectedRoute } from "@/routes/ProtectedRoute"
import { AdminRoute } from "@/routes/AdminRoute"
import { LoginPage } from "@/pages/auth/login"
import { HomePage } from "@/pages/dashboard/home"
import { UserManagementPage } from "@/pages/admin/users"
import { AuditLogsPage } from "@/pages/admin/audit-logs"
import { RegionManagementPage } from "@/pages/admin/regions"
import { CustomerCodeManagementPage } from "@/pages/admin/customer-codes"
import { JvmlStockListPage } from "@/pages/jvml-stock"
import { SettingsPage } from "@/pages/admin/settings"
// JSW session adds: import { JswStockListPage } from "@/pages/jsw-stock"

export default function App() {
  return (
    <BrowserRouter>
      <AuthBootstrap />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/jvml-stock" element={<JvmlStockListPage />} />
            {/* JSW: <Route path="/jsw-stock" element={<JswStockListPage />} /> */}
            <Route element={<AdminRoute />}>
              <Route path="/admin/users" element={<UserManagementPage />} />
              <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
              <Route path="/admin/regions" element={<RegionManagementPage />} />
              <Route path="/admin/customer-codes" element={<CustomerCodeManagementPage />} />
              <Route path="/admin/settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
```

---

## 12. `frontend/src/pages/admin/settings/index.tsx` (CREATE or APPEND)

**This file does NOT yet exist** (confirmed via `ctx_tree frontend/src` — no
`pages/admin/settings/` directory found).

**Create it:**
```tsx
// src/pages/admin/settings/index.tsx
import { JvmlStockConfigCard } from "@/components/settings/JvmlStockConfigCard"

export function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          System configuration and scheduled task management.
        </p>
      </div>
      <JvmlStockConfigCard />
      {/* JSW session appends: <JswStockConfigCard /> */}
    </div>
  )
}

export default SettingsPage
```

**Collision note:** JSW session will also create or append to this file.
The orchestrator should CREATE this file with both `JvmlStockConfigCard` AND
`JswStockConfigCard` in a single pass (after both builder sessions complete their
card components), OR create it with only JVML card first and add a surgical Edit
for JSW card. The file must be created exactly once.

---

## 13. FE Audit Log: `src/types/admin/audit-log.ts`

**Current `AuditCategory` type (lines 20–30):**
```typescript
export type AuditCategory =
  | "http"
  | "auth"
  | "admin"
  | "data"
  | "system"
  | "cron"
  | "security"
  | "regions"
  | "customer_codes"
```

**Replace with (append `"jvml_stock"` before closing):**
```typescript
export type AuditCategory =
  | "http"
  | "auth"
  | "admin"
  | "data"
  | "system"
  | "cron"
  | "security"
  | "regions"
  | "customer_codes"
  | "jvml_stock"
```

**Collision note:** JSW session adds `"jsw_stock"`. Merged:
```typescript
  | "customer_codes"
  | "jvml_stock"
  | "jsw_stock"
```

---

## 14. FE Audit Log: `src/components/admin/audit-logs/AuditCategoryBadge.tsx`

**The `CATEGORY_MAP` uses `as const satisfies Record<string, { label: string; className: string }>`.
Adding an entry requires inserting before the closing `} as const satisfies ...`.**

**Anchor — current last entry in CATEGORY_MAP (line ~69):**
```typescript
  customer_codes: {
    label: "Customer Codes",
    className:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400",
  },
} as const satisfies Record<string, { label: string; className: string }>
```

**Insert before `} as const satisfies ...`:**
```typescript
  jvml_stock: {
    label: "JVML Stock",
    className:
      "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-400",
  },
```

**Chosen color: cyan** — distinct from all existing colors (slate/indigo/violet/teal/sky/amber/red/emerald/rose).

**CRITICAL TypeScript constraint:** The `AuditCategoryBadgeProps` type in
`src/types/admin/audit-log-ui.ts` uses `category: AuditCategory`. After adding
`"jvml_stock"` to the `AuditCategory` union in `audit-log.ts`, the `satisfies`
check on CATEGORY_MAP will fail at compile time unless `jvml_stock` key is also
present in the map. The two edits (type union + badge map) must be applied together.

**Collision note:** JSW session adds `jsw_stock` entry. Both entries are inserted
before `} as const satisfies ...`. Orchestrator merges:
```typescript
  jvml_stock: {
    label: "JVML Stock",
    className:
      "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-400",
  },
  jsw_stock: {
    label: "JSW Stock",
    className:
      "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/50 dark:text-orange-400",
  },
```

---

## Concurrency Merge Summary

The table below shows every shared file, both sessions' required changes, and the
merge strategy for the orchestrator's single serialized pass:

| File | JVML adds | JSW adds | Merge strategy |
|---|---|---|---|
| `models/__init__.py` | 3 JvmlStock* imports + `__all__` | 3 JswStock* imports + `__all__` | One combined import block + merged `__all__` |
| `core/database.py` | JvmlStock* in import + DOCUMENT_MODELS | JswStock* in import + DOCUMENT_MODELS | Single import line + single list |
| `routes/__init__.py` | `jvml_stock` in from-import + 2 `include_router` | `jsw_stock` in from-import + 2 `include_router` | Merged from-import line; append both sets |
| `services/audit/events.py` | `audit_jvml_stock_event` function | `audit_jsw_stock_event` function | Sequential appends — no conflict |
| `models/audit_log.py` | `"jvml_stock"` in Literal | `"jsw_stock"` in Literal | One Literal edit with both values |
| `schemas/audit_log.py` | `"jvml_stock"` in Literal | `"jsw_stock"` in Literal | One Literal edit with both values |
| `services/audit_log/options.py` | `"jvml_stock"` in `_CATEGORIES` | `"jsw_stock"` in `_CATEGORIES` | One list edit with both values |
| `core/scheduler.py` | `apply_jvml_stock_schedule` + startup call | `apply_jsw_stock_schedule` + startup call | Two separate functions; two startup try/except blocks |
| `api/client.ts` | `putData` helper | `putData` helper (same) | Add once only |
| `nav-items.ts` | Boxes+Settings imports; JVML nav item; Settings admin item | Boxes import; JSW nav item; Settings admin item | Merged imports; both nav items; Settings once |
| `App.tsx` | JVML import + `/jvml-stock` route + Settings route | JSW import + `/jsw-stock` route + Settings route | Both imports; both routes; Settings once |
| `pages/admin/settings/index.tsx` | Create with JvmlStockConfigCard | Add JswStockConfigCard | Create once with both cards |
| `types/admin/audit-log.ts` | `"jvml_stock"` union member | `"jsw_stock"` union member | One type edit with both values |
| `AuditCategoryBadge.tsx` | `jvml_stock` cyan entry | `jsw_stock` orange entry | Both entries before `} as const satisfies` |

---

## Import Path Reference for Builder Files

These are the confirmed import paths builders must use:

```python
# Audit event helper
from app.services.audit.events import audit_jvml_stock_event

# audited_job decorator
from app.services.cron import audited_job  # NOT from .decorators

# Scheduler function (async)
from app.core.scheduler import apply_jvml_stock_schedule

# AsyncOption schema
from app.schemas.admin_user import AsyncOption  # confirmed — also re-exported from schemas.audit_log

# success() response helper
from app.core.responses import success

# PageQuery / PaginationMeta
from app.schemas.common import PageQuery, PaginationMeta

# Auth deps
from app.core.auth_deps import get_current_user, get_current_admin

# CustomerCode model (for customer_map lookup)
from app.models.customer_code import CustomerCode
```

```typescript
// FE API helpers (all confirmed present in client.ts after wiring)
import { getData, postData, patchData, putData, getList, buildQuery } from "@/api/client"

// EmailChipInput — confirmed at
// @/components/admin/regions/EmailChipInput
import { EmailChipInput } from "@/components/admin/regions/EmailChipInput"

// AsyncCombobox
import { AsyncCombobox } from "@/components/common/AsyncCombobox"

// DateRangePicker
import { DateRangePicker } from "@/components/common/DateRangePicker"

// Field primitives (shadcn ui/field)
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
```

---

## File Creation Checklist for Builder

New files ONLY (no shared-file edits by builder agents):

**Backend:**
- `backend/app/models/jvml_stock.py`
- `backend/app/models/jvml_stock_config.py`
- `backend/app/models/jvml_stock_ingestion.py`
- `backend/app/schemas/jvml_stock.py`
- `backend/app/schemas/jvml_stock_record.py`
- `backend/app/schemas/jvml_stock_config.py`
- `backend/app/utils/jvml_stock/__init__.py`
- `backend/app/utils/jvml_stock/columns.py`
- `backend/app/utils/jvml_stock/excel.py`
- `backend/app/utils/jvml_stock/query.py`
- `backend/app/services/jvml_stock/__init__.py`
- `backend/app/services/jvml_stock/serialize.py`
- `backend/app/services/jvml_stock/list.py`
- `backend/app/services/jvml_stock/options.py`
- `backend/app/services/jvml_stock/customer_map.py`
- `backend/app/services/jvml_stock/ingest.py`
- `backend/app/services/jvml_stock/poller.py`
- `backend/app/services/jvml_stock/emails.py`
- `backend/app/services/jvml_stock/config_service.py`
- `backend/app/services/jvml_stock/status.py`
- `backend/app/services/cron/jvml_stock.py`
- `backend/app/controllers/jvml_stock.py`
- `backend/app/controllers/jvml_stock_config.py`
- `backend/app/routes/jvml_stock.py`

**Frontend:**
- `frontend/src/types/jvml-stock/stock.ts`
- `frontend/src/types/jvml-stock/stock-ui.ts`
- `frontend/src/types/settings/jvml-stock-config.ts`
- `frontend/src/types/settings/jvml-stock-config-ui.ts`
- `frontend/src/api/jvml-stock/list.ts`
- `frontend/src/api/jvml-stock/options.ts`
- `frontend/src/api/settings/jvml-stock-config/get.ts`
- `frontend/src/api/settings/jvml-stock-config/update.ts`
- `frontend/src/api/settings/jvml-stock-config/status.ts`
- `frontend/src/api/settings/jvml-stock-config/runNow.ts`
- `frontend/src/components/jvml-stock/JvmlStockTable.tsx`
- `frontend/src/components/jvml-stock/JvmlStockTableToolbar.tsx`
- `frontend/src/components/jvml-stock/JvmlStockFilters.tsx`
- `frontend/src/components/jvml-stock/JvmlStockTablePagination.tsx`
- `frontend/src/components/jvml-stock/ViewJvmlStockSheet.tsx`
- `frontend/src/components/jvml-stock/hooks/useJvmlStockList.ts`
- `frontend/src/components/settings/JvmlStockConfigCard.tsx`
- `frontend/src/components/settings/JvmlStockConfigStatus.tsx`
- `frontend/src/components/settings/hooks/useJvmlStockConfig.ts`
- `frontend/src/pages/jvml-stock/index.tsx`
- `frontend/src/pages/admin/settings/index.tsx` ← ORCHESTRATOR creates (shared)
