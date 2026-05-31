# Region Management — Frozen Architecture Contract (SPEC)

> **Status:** authoritative source of truth for every implementation agent.
> Do NOT invent names, fields, params, or shapes not listed here. If something is
> missing, follow the nearest existing analog (User Management / Audit Logs) and
> keep it consistent with this contract. Every file ≤ 250 lines.

Goal: an admin-only **Region Management** CRUD. A Region is a notification/distribution
group: `{ name, emails[], active }`. Backend-driven filters (search + Active/Inactive
select), premium UI consistent with User Management & Audit Logs, full audit-log
integration under a NEW `regions` audit category.

Decision (locked by user): filters operate on the **region's own fields only**
(search by name/email + active select). No customer/segment linkage.

---

## 0. Conventions (must match existing code)

- API envelope: success `{success, data, message, meta}`; error `{success:false, error:{code, message, details}}`.
- Pagination defaults: `page=1 limit=20 max=100`, `sortOrder=desc`. Sort keys whitelisted via `Literal`.
- Backend layers: `routes/ → controllers/ (thin) → services/<domain>/<action>.py → schemas/ + models/`. Cross-cutting in `core/`.
- Controllers reject unknown query keys (frozenset allow-list) and depend on `get_current_admin`.
- Beanie 2.x: `distinct` is `await Region.distinct(key, filter)` (classmethod), NOT on `FindMany`.
- Frontend: no client-side filtering of server data; types in `src/types/admin/`; API calls in `src/api/admin/regions/`; never call backend from a component; semantic design tokens only; ≥4.5:1 contrast.
- Frontend forms: manual `useState` + `validate()` + `try/catch` + `sonner` toast (NO react-hook-form/zod — project doesn't use them).
- Frontend data fetching: plain `useState/useEffect` + `fetchIdRef` race guard (NO react-query/RTK Query).

---

## 1. BACKEND

### 1.1 Model — `backend/app/models/region.py` (NEW)

Beanie `Document` named `Region`, collection `regions`. Mirror `models/audit_log.py` style (use a module-level `_now_utc()` returning tz-aware UTC `datetime`).

Fields:
| Field | Type | Index | Default |
|---|---|---|---|
| `name` | `str` | yes | required |
| `emails` | `list[str]` | no | `[]` (Field default_factory=list) |
| `active` | `bool` | yes | `True` |
| `created_at` | `datetime` | yes | `_now_utc` |
| `updated_at` | `datetime` | no | `_now_utc` |

`class Settings: name = "regions"`. Add `indexes` for `name`, `active`, `created_at` (use Beanie `Indexed`/`Settings.indexes` consistent with how `audit_log.py` declares indexes).

### 1.2 Schemas — `backend/app/schemas/region.py` (NEW)

Import `PageQuery` from `..schemas.common` (same base User/Audit use). Use `pydantic.EmailStr` for validation (email-validator is installed).

```python
RegionSortBy = Literal["name", "active", "created_at", "updated_at"]

class RegionListQuery(PageQuery):
    sortBy: RegionSortBy = "created_at"
    q: str | None = None
    active: bool | None = None          # FastAPI coerces ?active=true/false

class RegionOptionsQuery(BaseModel):
    q: str | None = None
    limit: int = Field(default=20, ge=1, le=50)

class RegionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    emails: list[EmailStr] = Field(default_factory=list)
    active: bool = True
    # validators: strip name; lowercase + dedupe emails (preserve order); cap len(emails) <= 100

class RegionUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    emails: list[EmailStr] | None = None
    active: bool | None = None
    # same normalization validators (when provided)

class RegionPublic(BaseModel):
    id: str
    name: str
    emails: list[str]
    active: bool
    created_at: datetime
    updated_at: datetime

class RegionOption(BaseModel):       # for AsyncCombobox search
    value: str                       # region id
    label: str                       # region name
    sublabel: str | None = None      # e.g. "{n} recipients · Active"
```

Note: `emails: list[EmailStr]` serializes to plain strings in `RegionPublic` (declared `list[str]`). Validators normalize emails to lowercase + de-duplicate.

### 1.3 Query utils — `backend/app/utils/region/query.py` (NEW) + `__init__.py`

Mirror `utils/audit_log/query.py` / `utils/user/query.py`.

```python
def build_region_filter(query: RegionListQuery) -> dict[str, Any]:
    filt = {}
    if query.q:
        rx = {"$regex": re.escape(query.q), "$options": "i"}
        filt["$or"] = [{"name": rx}, {"emails": rx}]   # regex matches any array element
    if query.active is not None:
        filt["active"] = query.active
    return filt

def build_sort(sort_by: str, sort_order: str) -> str:
    return ("-" if sort_order == "desc" else "+") + sort_by
```

### 1.4 Services — `backend/app/services/region/` (NEW dir + `__init__.py`)

One file per op. Each mutation emits an audit event (see 1.7). Raise typed errors from `core/errors.py`.

- `serialize.py` → `to_public(doc: Region) -> RegionPublic` (`id=str(doc.id)`).
- `list.py` → `async def list_regions(query: RegionListQuery) -> tuple[list[RegionPublic], PaginationMeta]`. Use `build_region_filter`, `build_sort`, `.skip()/.limit()/.to_list()`, `.count()`. Build `PaginationMeta` exactly like `services/user/list.py`.
- `get.py` → `async def get_region(region_id: str) -> RegionPublic`. Guard invalid ObjectId (catch `bson.errors.InvalidId`/`beanie` PydanticObjectId failure) → `NotFoundError("Region not found")`. Mirror `services/audit_log/get.py`.
- `create.py` → `async def create_region(data: RegionCreate, actor_email: str | None) -> RegionPublic`. Case-insensitive name uniqueness check (`Region.find_one` with `{"name": {"$regex": f"^{re.escape(data.name)}$", "$options": "i"}}`) → `ConflictError("A region with this name already exists")` if found. Insert; set `created_at=updated_at=_now_utc()`. After insert, `await audit_region_event("region.created", f"Created region '{doc.name}'", actor_email=actor_email, extra={"region_id": str(doc.id), "active": doc.active, "recipient_count": len(doc.emails)})`. Return `to_public`.
- `update.py` → `async def update_region(region_id: str, data: RegionUpdate, actor_email: str | None) -> RegionPublic`. Fetch (NotFound). Apply only provided (`exclude_unset`) fields; if name changing, re-check uniqueness (exclude self). Bump `updated_at`. Save. Audit `region.updated` with `extra={"region_id":..., "changed": [field names]}`. Return public.
- `delete.py` → `async def delete_region(region_id: str, actor_email: str | None) -> None`. Fetch (NotFound). Capture name. Delete. Audit `region.deleted` with `extra={"region_id":..., "name": name}`.
- `options.py` → `async def search_region_options(query: RegionOptionsQuery) -> list[RegionOption]`. Regex on `name` (case-insensitive). Limit. Map to `RegionOption(value=str(id), label=name, sublabel=f"{len(emails)} recipient(s) · {'Active' if active else 'Inactive'}")`.

### 1.5 Controller — `backend/app/controllers/region.py` (NEW)

Mirror `controllers/audit_log.py` exactly (unknown-key rejection via frozenset, `Depends(get_current_admin)`, `success(...)`).

```python
_ALLOWED_LIST_KEYS = frozenset({"page","limit","sortBy","sortOrder","q","active"})
_ALLOWED_OPTION_KEYS = frozenset({"q","limit"})

async def list_regions_controller(request, query: RegionListQuery = Depends(), admin = Depends(get_current_admin))
async def region_options_controller(request, query: RegionOptionsQuery = Depends(), admin = Depends(get_current_admin))
async def create_region_controller(request, body: RegionCreate, admin = Depends(get_current_admin))   # message="Region created"
async def get_region_controller(region_id: str, admin = Depends(get_current_admin))
async def update_region_controller(region_id: str, body: RegionUpdate, admin = Depends(get_current_admin))  # message="Region updated"
async def delete_region_controller(region_id: str, admin = Depends(get_current_admin))  # success(None, message="Region deleted")
```

Thread `actor_email=admin.emailid` into create/update/delete service calls. (AuthUser has `.emailid` — confirm against `core/auth_deps.py`.)

Unknown-key check helper: replicate the exact pattern used in `controllers/audit_log.py` (compare `request.query_params` keys to the allow-list, raise `ValidationError`).

### 1.6 Routes — `backend/app/routes/region.py` (NEW)

```python
router = APIRouter(prefix="/admin/regions", tags=["admin-regions"], dependencies=[Depends(get_current_admin)])
# literal paths BEFORE /{region_id}:
router.add_api_route("",         list_regions_controller,   methods=["GET"])
router.add_api_route("/options", region_options_controller, methods=["GET"])
router.add_api_route("",         create_region_controller,  methods=["POST"], status_code=201)
router.add_api_route("/{region_id}", get_region_controller,    methods=["GET"])
router.add_api_route("/{region_id}", update_region_controller, methods=["PATCH"])
router.add_api_route("/{region_id}", delete_region_controller, methods=["DELETE"])
```
Match the `response_model`/registration style of `routes/audit_log.py`.

### 1.7 Audit integration (NEW `regions` category)

Add the new category in ALL of these (kept in sync manually):
1. `backend/app/models/audit_log.py` — add `"regions"` to `AuditCategory` Literal.
2. `backend/app/schemas/audit_log.py` — add `"regions"` to `AuditCategory` Literal.
3. `backend/app/services/audit_log/options.py` — add `"regions"` to the `_CATEGORIES` list.
4. `backend/app/services/audit/events.py` — add helper:
```python
async def audit_region_event(action: str, summary: str, *, outcome: str = "success",
                             actor_email: str | None = None, extra: dict | None = None) -> None:
    await record_audit(category="regions", action=action, summary=summary,
                       outcome=outcome, source="service", actor_email=actor_email, extra=extra)
```
Actions used: `region.created`, `region.updated`, `region.deleted`.

> The pure-ASGI `AuditMiddleware` will ALSO record the HTTP call as category `admin`
> automatically — that is expected. The explicit `regions` events give a clean
> domain-level trail and populate the new category filter. Do NOT add `/admin/regions`
> to `audit_skip_path_prefixes`.

### 1.8 Wiring edits (shared files — done by ONE wiring agent, never in parallel)

- `backend/app/models/__init__.py` — `from .region import Region`; add `"Region"` to `__all__`.
- `backend/app/core/database.py` — import `Region`, append to `DOCUMENT_MODELS`.
- `backend/app/routes/__init__.py` — `from . import region`; `api_router.include_router(region.router)`.

---

## 2. FRONTEND

### 2.1 Types — `src/types/admin/region.ts` (NEW)

```ts
import type { PageQuery } from "@/types/api/envelope"   // confirm exact import path

export interface Region {
  id: string
  name: string
  emails: string[]
  active: boolean
  created_at: string
  updated_at: string
}
export type RegionSortBy = "name" | "active" | "created_at" | "updated_at"
export interface RegionListQuery extends PageQuery {
  sortBy?: RegionSortBy
  q?: string
  active?: boolean | "all"          // "all" = UI sentinel (stripped before request)
}
export interface CreateRegionInput { name: string; emails: string[]; active: boolean }
export interface UpdateRegionInput { name?: string; emails?: string[]; active?: boolean }
export interface RegionOption { value: string; label: string; sublabel?: string }
```

### 2.2 UI types — `src/types/admin/region-ui.ts` (NEW)

Mirror `types/admin/user-ui.ts` / `audit-log-ui.ts`: `DialogBaseProps {open; onOpenChange; onSubmitted?}`, `CreateRegionDialogProps`, `EditRegionDialogProps {region}`, `ViewRegionSheetProps {region}`, `ConfirmRegionActionProps {variant:"delete"|"deactivate"|"activate"; region; onConfirm}`, `RegionTableToolbarProps {query; onQueryChange; onCreate}`, `RegionTableProps {rows; loading; error; sortBy; sortOrder; onSort; onView; onEdit; onDelete; onToggleActive}`, `RegionTablePaginationProps`, `RegionActiveBadgeProps {active}`, `RowActionsMenuProps`, `UseRegionManagementResult`.

### 2.3 API — `src/api/admin/regions/` (NEW)

Use helpers from `src/api/client.ts`: `getList`, `getData`, `postData`, `patchData`, `deleteData`, `buildQuery`.

- `list.ts` → `listRegions(query: RegionListQuery = {}): Promise<PaginatedResult<Region>>`. Normalize: drop `active === "all"`; convert `active` boolean → string is unnecessary (buildQuery handles), but strip undefined. `getList<Region>(\`/admin/regions${buildQuery({...normalized})}\`)`.
- `get.ts` → `getRegion(id): Promise<Region>` = `getData(\`/admin/regions/${id}\`)`.
- `create.ts` → `createRegion(input: CreateRegionInput): Promise<Region>` = `postData("/admin/regions", input)`.
- `update.ts` → `updateRegion(id, input: UpdateRegionInput): Promise<Region>` = `patchData(\`/admin/regions/${id}\`, input)`.
- `remove.ts` → `removeRegion(id): Promise<null>` = `deleteData(\`/admin/regions/${id}\`)`.
- `options.ts` → `searchRegionOptions(q: string): Promise<RegionOption[]>` = `getData(\`/admin/regions/options${buildQuery({ q, limit: 20 })}\`)`.

### 2.4 Components — `src/components/admin/regions/` (NEW)

Mirror the User Management set 1:1. Each file ≤250 lines.

- `RegionTableToolbar.tsx` — `AsyncCombobox` (search via `searchRegionOptions`) + `FilterCombobox` Active/Inactive (`options=[{value:"true",label:"Active"},{value:"false",label:"Inactive"}]`, `allLabel="All statuses"`) + "Create region" button. Wire to `onQueryChange`.
- `RegionTable.tsx` — sortable server-driven table. Columns: **Name** (sortable), **Recipients** (email chips, flex-wrap; `—` when empty), **Status** (`RegionActiveBadge`, sortable on `active`), **Updated** (`updated_at`, sortable, formatted), **actions** (`RowActionsMenu`). Loading skeletons (8 rows), error state, empty state (use `MapPin` icon). Internal `SortableHead` copied from UserTable with `SortKey = RegionSortBy`.
- `RegionTablePagination.tsx` — clone `UserTablePagination` (prev/next, page indicator, rows-per-page select).
- `RegionActiveBadge.tsx` — `active ? emerald "Active" : muted "Inactive"` Badge (see SPEC §2.7).
- `RowActionsMenu.tsx` — DropdownMenu: View · Edit · Activate/Deactivate (toggle) · Delete (destructive).
- `CreateRegionDialog.tsx` — form: name `Input`; emails **tag/chip input** (type email + Enter/comma to add chip, X to remove; validate each via regex; show count); active `Switch`. Manual validate + `toast.success("Region created")` + `onSubmitted()`.
- `EditRegionDialog.tsx` — same form, re-seed from `region`, send only changed fields. `toast.success("Region updated")`.
- `ViewRegionSheet.tsx` — read-only Sheet: name, status badge, recipient list (one per line), created/updated timestamps. Mirror `ViewUserSheet`.
- `ConfirmActionDialog.tsx` — reuse the users' `ConfirmActionDialog` if its variant set covers delete/activate/deactivate; otherwise a region-local clone with `VARIANT_CONFIG` for `delete` (destructive), `deactivate`, `activate`.
- `hooks/useRegionManagement.ts` — all state: `query`, `rows`, `meta`, `loading`, `error`, dialog discriminated union (`{type:"create"|"view"|"edit"|"confirm-delete"|"confirm-toggle", region?}`), `actions` (`refetch`, `setSearch`, `setActive`, `setSort`, `setPage`, `setLimit`, `openDialog`, `closeDialog`, `remove`, `toggleActive`). `fetchIdRef` race guard; filter/sort setters reset `page:1`. Toasts on mutations. **If this file would exceed 250 lines, split mutation handlers into `hooks/useRegionMutations.ts`.**

### 2.5 Page — `src/pages/admin/regions/index.tsx` (NEW)

Export `RegionManagementPage`. Compose exactly like `pages/admin/users/index.tsx`: page header (icon chip `MapPin` + h2 "Region Management" + subtitle "Manage regional distribution groups and their notification recipients.") + `<Separator />` + toolbar + table + pagination + dialogs/sheet. All state from `useRegionManagement()`.

### 2.6 Wiring edits (shared files — ONE wiring agent)

- `src/components/layout/nav-items.ts` — import `MapPin` from lucide-react; append to `ADMIN_NAV_ITEMS`: `{ label: "Region Management", to: "/admin/regions", icon: MapPin }`.
- `src/App.tsx` — `import { RegionManagementPage } from "@/pages/admin/regions"`; add `<Route path="/admin/regions" element={<RegionManagementPage />} />` inside the existing `<AdminRoute>` block.
- **Audit category in frontend** (so the new `regions` category shows in audit-log filters with a proper badge):
  - `src/types/admin/audit-log.ts` — add `"regions"` to the `AuditCategory` union.
  - `src/components/admin/audit-logs/AuditCategoryBadge.tsx` — add a `regions` color mapping (distinct token, e.g. indigo/violet) so it doesn't fall through to the default.
  - If the audit-log category filter options are a hardcoded frontend list (not derived from backend facets/`/options`), add `"regions"` there too. Inspect `AuditLogToolbar.tsx` / `useAuditLogs.ts` first; if categories come from backend facets, no extra change needed (backend `_CATEGORIES` already updated).

### 2.7 Premium UI / design parity (NO AI slop)

- Page header: icon chip `h-9 w-9 rounded-lg bg-primary/10 text-primary` + `h2 text-xl font-semibold tracking-tight` + `p text-sm text-muted-foreground`.
- Active badge: Active = `bg-emerald-600 text-white dark:bg-emerald-700 border-transparent`; Inactive = `variant="outline" text-muted-foreground`.
- Recipient emails: `font-mono text-xs text-muted-foreground` chips, flex-wrap gap-1; `—` muted when empty; in the table cap visible chips (e.g. show first 3 + "+N more").
- Tokens only (no raw hex): `--primary` indigo, gold `--accent`/`--sidebar-primary`, Geist font. ≥4.5:1 contrast. Respect dark mode.
- States: 8-row skeletons while loading; centered muted empty state with `MapPin` icon; destructive-tinted error state. Spinner-in-button on submit; disable inputs while submitting; `role="alert"` API error banner.
- Email chip input must be keyboard accessible (Enter/comma add, Backspace removes last, X button per chip, aria-labels).

---

## 3. VERIFICATION (definition of done)

Backend:
- `cd backend && ./.venv/bin/python -c "import app.main"` imports clean.
- TestClient smoke: unauth `GET /admin/regions` → 401; (with admin session) create→list→get→update→delete happy path returns correct envelopes; unknown `?sortBy=bogus` rejected; unknown query key rejected (422/400 per pattern).
- A region mutation writes an `audit_logs` doc with `category="regions"`, `action="region.created"`, actor email set; emails NOT redacted.
- All new backend files ≤250 lines.

Frontend:
- `cd frontend && npm run build` (tsc -b && vite build) green.
- `npm run lint` clean for new files.
- Region Management nav item visible only to admins; route guarded by `AdminRoute`.
- "regions" appears in the Audit Logs category filter with a styled badge.
- All new frontend files ≤250 lines.

Docs (final): update `CODEX.md` (Architecture Decisions + Session Log), `backend/CLAUDE.md`, `frontend/CLAUDE.md` with the Regions domain.
