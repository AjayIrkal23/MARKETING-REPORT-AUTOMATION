# User Management + OTP First-Login — End-to-End Action Plan & Contract

> **This document is the single source of truth.** Every implementation agent reads the
> relevant section here and implements EXACTLY against these contracts so nothing drifts.
> Date: 2026-05-30. Stack: FastAPI + Beanie/MongoDB (cookie/JWT auth) · Vite + React 19 + TS +
> Tailwind v4 + shadcn/ui + Redux Toolkit. Project path contains spaces — use Read/Edit/Write,
> not ctx_read. Standard envelope `{success,data,message,meta}` / `{success:false,error:{code,message,details}}`.
> Every file ≤250 lines. Semantic tokens only (no raw hex). No client-side filtering of server data.

---

## 1. Feature summary

1. **Sidebar**: a new **"Administrator Config"** group, visible **only to admins**, containing a
   **User Management** item (`/admin/users`).
2. **User Management page** (admin only): create, view, edit, delete, change-password, and
   enable/disable users — server-driven **paginated** table with search + filters.
3. **OTP first-login**: a created user has **`password = null`** and `status = "invited"`. On first
   login the backend signals setup; the user receives an **email OTP**, enters it, **sets a password**,
   and the account becomes **`active`** (and they're logged in). Admin can **disable** an account
   (`status = "disabled"`) → that user cannot log in.
4. **Backend-driven async select/search**: a reusable combobox whose options come from the backend
   (**limit ≤ 200**, server-side search-as-you-type).

## 2. Decisions & assumptions (no blocking questions)

- **Email delivery**: `core/email.py` is **pluggable SMTP** (env: `SMTP_HOST/PORT/USER/PASSWORD/FROM`).
  When `SMTP_HOST` is empty (dev), it **logs the email (incl. OTP) to the server console** so the flow
  is testable without a mail server. *Production needs real SMTP creds.* **OTP is NEVER returned in an API response.**
- **Admin "change password"** = `POST /admin/users/{id}/reset-password` accepting an optional
  `newPassword`: if provided → set it directly (status→active); if omitted → **null the password +
  status→invited** (forces OTP re-setup). Covers both interpretations.
- **`name`** field added to users (display name). **Email is the immutable login key** (not editable).
- **Guards**: cannot disable/delete **your own** account; cannot remove the **last active admin**.
- **Table state** lives in a hook (`useUserManagement`) calling the API — **no Redux slice** for the
  list, **no client-side filtering** (page/limit/sort/search/status/role all go to the backend).
- **OTP**: 6 digits, hashed at rest (bcrypt), 10-min TTL, max 5 attempts, 60s resend throttle,
  per-IP rate-limited. Generic responses to avoid user enumeration.

---

## 3. BACKEND CONTRACT

### 3.1 `models/user.py` — extend `User`
```python
from datetime import datetime, timezone
from typing import Annotated, Literal
from beanie import Document, Indexed
from pydantic import EmailStr, Field

class User(Document):
    emailid: Annotated[EmailStr, Indexed(unique=True)]
    name: str | None = None
    password: str | None = None                 # bcrypt hash; None until OTP setup completes
    status: Literal["invited", "active", "disabled"] = "invited"
    isAdmin: bool = False
    lastlogined: datetime | None = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # OTP first-login setup
    otp_hash: str | None = None
    otp_expires_at: datetime | None = None
    otp_attempts: int = 0
    otp_last_sent_at: datetime | None = None
    class Settings:
        name = "users"
```

### 3.2 `core/config.py` — add settings (append to existing `Settings`)
```python
# Email / SMTP (dev-log fallback when smtp_host is empty)
smtp_host: str = ""
smtp_port: int = 587
smtp_user: str = ""
smtp_password: str = ""
smtp_from: str = "no-reply@jsw-marketing.local"
smtp_starttls: bool = True
app_name: str = "JSW Marketing Reports"
app_base_url: str = "http://localhost:5173"
# OTP / password policy
otp_length: int = 6
otp_ttl_seconds: int = 600
otp_max_attempts: int = 5
otp_resend_interval_seconds: int = 60
password_min_length: int = 8
```

### 3.3 `core/errors.py` — add subclasses
```python
class PasswordSetupRequiredError(AppError):  # login on an invited account -> frontend starts OTP setup
    status_code = 409
    code = "PASSWORD_SETUP_REQUIRED"

class AccountDisabledError(AppError):
    status_code = 403
    code = "ACCOUNT_DISABLED"
```
(`ValidationError 400`, `UnauthorizedError 401`, `ForbiddenError 403`, `NotFoundError 404`,
`ConflictError 409`, `RateLimitError 429` already exist.)

### 3.4 `core/otp.py` (new)
```python
def generate_otp(length: int) -> str         # cryptographically-random numeric string (secrets)
def hash_otp(otp: str) -> str                 # bcrypt (reuse core.security.hash_password)
def verify_otp(otp: str, otp_hash: str) -> bool
```

### 3.5 `core/email.py` (new)
```python
async def send_email(to: str, subject: str, text: str, html: str | None = None) -> None
# If settings.smtp_host: send via smtplib.SMTP in asyncio.to_thread (STARTTLS if smtp_starttls).
# Else: log subject+body at INFO (dev fallback). Never raise to caller on send failure beyond logging.
def render_otp_email(otp: str, ttl_minutes: int, app_name: str) -> tuple[str, str, str]  # (subject, text, html)
def render_invite_email(name: str, app_name: str, app_base_url: str) -> tuple[str, str, str]
```

### 3.6 `core/auth_deps.py` — add admin dependency
```python
from fastapi import Depends
from .errors import ForbiddenError
async def get_current_admin(current_user: AuthUser = Depends(get_current_user)) -> AuthUser:
    if not current_user.isAdmin:
        raise ForbiddenError("Admin access required")
    return current_user
```

### 3.7 Schemas
`schemas/auth.py` (append): `AuthUser` already exists; keep `LoginRequest`.
`schemas/otp.py` (new):
```python
class RequestOtpRequest(BaseModel): emailid: EmailStr
class ConfirmSetupRequest(BaseModel):
    emailid: EmailStr
    otp: str = Field(min_length=4, max_length=10)
    newPassword: str = Field(min_length=8, max_length=128)
class GenericMessage(BaseModel): message: str
```
`schemas/admin_user.py` (new):
```python
UserStatusT = Literal["invited", "active", "disabled"]
AdminUserSortBy = Literal["name", "emailid", "status", "isAdmin", "lastlogined", "createdAt"]

class AdminUserPublic(BaseModel):
    id: str
    name: str | None
    emailid: EmailStr
    isAdmin: bool
    status: UserStatusT
    lastlogined: datetime | None
    createdAt: datetime

class AdminUserListQuery(PageQuery):     # PageQuery in schemas/common.py
    sortBy: AdminUserSortBy = "createdAt"
    sortOrder: Literal["asc", "desc"] = "desc"
    q: str | None = Field(default=None, max_length=100)
    status: Literal["invited", "active", "disabled", "all"] = "all"
    role: Literal["admin", "user", "all"] = "all"

class CreateUserRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    emailid: EmailStr
    isAdmin: bool = False

class UpdateUserRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    isAdmin: bool | None = None

class ResetPasswordRequest(BaseModel):
    newPassword: str | None = Field(default=None, min_length=8, max_length=128)

class AsyncOption(BaseModel):
    value: str
    label: str
    sublabel: str | None = None

class UserOptionsQuery(BaseModel):
    q: str | None = Field(default=None, max_length=100)
    limit: int = Field(default=50, ge=1, le=200)

def to_admin_user_public(user) -> AdminUserPublic   # helper: User doc -> DTO (id=str(user.id))
```

### 3.8 Endpoints (all responses use the standard envelope)
**Auth setup** (`routes/auth.py`, rate-limited; under existing `/auth` prefix):
| Method | Path | Body | Data | Notes |
|---|---|---|---|---|
| POST | `/auth/setup/request-otp` | `RequestOtpRequest` | `GenericMessage` | Only sends if user exists & status=="invited"; always generic 200. 60s resend throttle. |
| POST | `/auth/setup/confirm` | `ConfirmSetupRequest` | `AuthUser` | Verify OTP → set password → status=active → clear OTP → **set session cookie** (controller). |
| POST | `/auth/login` (MODIFY) | `LoginRequest` | `AuthUser` | invited→`PasswordSetupRequiredError(409)`; disabled→`AccountDisabledError(403)`; else verify. |

**Admin users** (new `routes/admin_user.py`, router gated by `dependencies=[Depends(get_current_admin)]`):
| Method | Path | Body/Query | Data |
|---|---|---|---|
| GET | `/admin/users` | `AdminUserListQuery` | `AdminUserPublic[]` + pagination `meta` |
| GET | `/admin/users/options` | `UserOptionsQuery` | `AsyncOption[]` (≤200; **register before `/{id}`**) |
| POST | `/admin/users` | `CreateUserRequest` | `AdminUserPublic` (status=invited, password=None; sends invite email) |
| GET | `/admin/users/{id}` | — | `AdminUserPublic` |
| PATCH | `/admin/users/{id}` | `UpdateUserRequest` | `AdminUserPublic` |
| DELETE | `/admin/users/{id}` | — | `null` (guards: not self, not last admin) |
| POST | `/admin/users/{id}/disable` | — | `AdminUserPublic` (guards) |
| POST | `/admin/users/{id}/enable` | — | `AdminUserPublic` (→ active if password set, else invited) |
| POST | `/admin/users/{id}/reset-password` | `ResetPasswordRequest` | `AdminUserPublic` |

`{id}` is a Beanie `PydanticObjectId` parsed from `str`; invalid/missing → `NotFoundError(404)`.

### 3.9 Services / utils / controllers / routes (file map)
- `services/auth/otp_request.py` → `request_setup_otp(emailid)`: find invited user; throttle; gen+hash+store OTP; `send_email`; generic return.
- `services/auth/setup_confirm.py` → `confirm_setup(payload) -> AuthUser`: validate invited; check expiry/attempts; verify OTP; set password (hash), status=active, clear OTP, stamp lastlogined.
- `services/auth/login.py` (MODIFY): status branching per §3.8.
- `services/admin_user/list.py`, `get.py`, `create.py`, `update.py`, `delete.py`, `enable.py`, `disable.py`, `reset_password.py`, `options.py`. Business logic + DB only; raise typed `AppError`; return DTOs.
- `utils/admin_user/query.py`: `build_admin_filter(query)` (re.escape q over name+email; status/role filters), `build_sort(sortBy, sortOrder)`.
- `services/user/seed.py` (MODIFY): seed/ensure admin has `status="active"`, `name="Administrator"`, `password` set; **backfill an existing admin doc** that lacks `status`.
- `controllers/admin_user.py`: thin controllers (validate via Depends, call service, wrap `success()`); unknown-query-param rejection on list (allowed keys: page,limit,sortBy,sortOrder,q,status,role).
- `controllers/auth.py` (MODIFY): add `request_otp_controller`, `confirm_setup_controller` (the latter sets the session cookie via the existing `_set_session_cookie`).
- `routes/admin_user.py` (new): router `prefix="/admin/users"`, `dependencies=[Depends(get_current_admin)]`; register `/options` before `/{id}`.
- `routes/auth.py` (MODIFY): add `/setup/request-otp`, `/setup/confirm` (rate-limited).
- `routes/__init__.py` (MODIFY): `include_router(admin_user.router)`.

### 3.10 Security (owasp-security / security-and-hardening)
- OTP hashed at rest; single-use; 10-min TTL; ≤5 attempts then invalidate; 60s resend throttle; per-IP rate-limit (reuse `core/ratelimit.py` pattern, separate limiter for setup).
- Generic responses (no enumeration) on request-otp and on confirm failures.
- Passwords bcrypt-hashed; min length 8; never returned. Admin endpoints gated by `get_current_admin` (403). All input validated by Pydantic. `id` parsing guarded.

### 3.11 Backend tests (`backend/tests/`, pytest, no live Mongo for unit-level)
- `test_otp.py`: generate/hash/verify; wrong/expired rejcontainer logic (pure helpers).
- `test_admin_user_query.py`: filter escaping, status/role filter shapes, sort tokens.
- `test_admin_auth_gating.py`: `/admin/users` without admin cookie → 401/403 (TestClient, guard runs before DB).
- `test_setup_schemas.py`: ConfirmSetupRequest validation (otp/newPassword length).

---

## 4. FRONTEND CONTRACT

### 4.1 `api/client.ts` — add
```ts
export async function patchData<T>(path: string, body: unknown): Promise<T>
export async function deleteData<T>(path: string): Promise<T>
```
(mirror `postData`; DELETE may return `null` data.)

### 4.2 Types
`types/admin/user.ts`:
```ts
export type UserStatus = "invited" | "active" | "disabled"
export type AdminUserSortBy = "name"|"emailid"|"status"|"isAdmin"|"lastlogined"|"createdAt"
export interface AdminUser { id:string; name:string|null; emailid:string; isAdmin:boolean; status:UserStatus; lastlogined:string|null; createdAt:string }
export interface AdminUserListQuery extends PageQuery { sortBy?:AdminUserSortBy; q?:string; status?:UserStatus|"all"; role?:"admin"|"user"|"all" }
export interface CreateUserInput { name:string; emailid:string; isAdmin:boolean }
export interface UpdateUserInput { name?:string; isAdmin?:boolean }
export interface ResetPasswordInput { newPassword?:string }
```
`types/admin/options.ts`: `AsyncOption { value:string; label:string; sublabel?:string }`, `OptionsQuery { q?:string; limit?:number }`.
`types/auth/otp.ts`: `RequestOtpInput { emailid:string }`, `ConfirmSetupInput { emailid:string; otp:string; newPassword:string }`.
`types/admin/user-ui.ts`: component prop contracts (dialog open/onOpenChange, user, onSubmit, etc.).

### 4.3 API modules (one call per file)
- `api/admin/users/list.ts` `listUsers(q: AdminUserListQuery): Promise<PaginatedResult<AdminUser>>`
- `api/admin/users/options.ts` `searchUserOptions(q: OptionsQuery): Promise<AsyncOption[]>`
- `api/admin/users/get.ts` `getUser(id): Promise<AdminUser>`
- `api/admin/users/create.ts` `createUser(input): Promise<AdminUser>`
- `api/admin/users/update.ts` `updateUser(id, input): Promise<AdminUser>`
- `api/admin/users/remove.ts` `deleteUser(id): Promise<null>`
- `api/admin/users/enable.ts` / `disable.ts` `setUserEnabled...(id): Promise<AdminUser>`
- `api/admin/users/resetPassword.ts` `resetUserPassword(id, input): Promise<AdminUser>`
- `api/auth/setup/requestOtp.ts` `requestSetupOtp(input): Promise<{message:string}>`
- `api/auth/setup/confirm.ts` `confirmSetup(input): Promise<AuthUser>`

### 4.4 Store / routing
- `store/auth/selectors.ts` (MODIFY): add `selectIsAdmin = (s) => s.auth.user?.role === "admin"`.
- `routes/AdminRoute.tsx` (new): if not authenticated → `/login`; if authenticated but not admin → `/home`; else `<Outlet/>`.
- `App.tsx` (MODIFY): inside DashboardLayout, add `<Route element={<AdminRoute/>}><Route path="/admin/users" element={<UserManagementPage/>}/></Route>`.

### 4.5 Sidebar (the requested admin section)
- `components/layout/nav-items.ts` (MODIFY): add `ADMIN_NAV_ITEMS: NavItem[] = [{ label:"User Management", to:"/admin/users", icon: ShieldUser /* lucide */ }]`; extend `titleForPath` to include admin items.
- `components/layout/AppSidebar.tsx` (MODIFY): below the main Navigation group, render a SidebarGroup with label **"Administrator Config"** iterating `ADMIN_NAV_ITEMS` — **only when `selectIsAdmin`** is true (read via `useAppSelector`). Reuse the existing premium active-indicator/hover styling already in AppSidebar. Group hides label in icon-collapsed mode.

### 4.6 Reusable backend-driven async select (the §1.4 requirement)
- `components/common/AsyncCombobox.tsx`: props `{ value: string|null; onChange:(v:string|null, opt?:AsyncOption)=>void; fetchOptions:(q:string)=>Promise<AsyncOption[]>; placeholder?; emptyText?; disabled?; allowClear? }`. Built on shadcn `Popover` + `Command`. Debounced (300ms) server search; shows up to the backend's ≤200 options; loading + empty states; keyboard accessible.
- `components/common/hooks/useAsyncOptions.ts`: manages `{query,setQuery,options,loading,error}` with debounce + race-safe fetch (ignore stale responses).

### 4.7 User Management page + components (`pages/admin/users/`, `components/admin/users/`)
- `pages/admin/users/index.tsx` — `UserManagementPage`: thin orchestrator (header + `<UserTableToolbar/>` + `<UserTable/>` + `<UserTablePagination/>` + dialogs), driven by `useUserManagement`.
- `components/admin/users/hooks/useUserManagement.ts` — owns query state `{page,limit,sortBy,sortOrder,q,status,role}`, fetched `{rows,meta,loading,error}`, dialog state, and mutation actions (`create/update/remove/enable/disable/resetPassword/refetch`). **All filtering/sorting/pagination via API params.** Toasts (sonner) on success/failure; refetch after mutations.
- `components/admin/users/UserTable.tsx` — shadcn `Table`; columns: Name, Email, Role (badge), Status (`<UserStatusBadge/>`), Last login, Created, Actions (`<RowActionsMenu/>`). Sortable headers call back into the hook. Skeleton rows while loading; empty state.
- `components/admin/users/UserTableToolbar.tsx` — left: `<AsyncCombobox/>` "Search users" (options from `searchUserOptions`) + Status `Select` (All/Invited/Active/Disabled) + Role `Select` (All/Admin/User). Right: "Create user" button (opens `CreateUserDialog`).
- `components/admin/users/UserTablePagination.tsx` — page prev/next, page X of N, total count, page-size `Select` (10/20/50). Reads `meta`.
- `components/admin/users/UserStatusBadge.tsx` — status → shadcn `Badge` variant + label (invited=amber/secondary, active=emerald/default, disabled=muted/destructive-outline). Semantic tokens.
- `components/admin/users/RowActionsMenu.tsx` — shadcn `DropdownMenu`: View, Edit, Change password, Enable/Disable (contextual), Delete. Disables self-actions appropriately.
- `components/admin/users/CreateUserDialog.tsx` — `Dialog` + form (name, email, role switch) → `createUser`. Validation + inline errors.
- `components/admin/users/EditUserDialog.tsx` — `Dialog` + form (name, role; email read-only) → `updateUser`.
- `components/admin/users/ViewUserSheet.tsx` — `Sheet` read-only detail (all fields + status + timestamps).
- `components/admin/users/ChangePasswordDialog.tsx` — `Dialog`: choose "Set a new password" (password field) OR "Send reset (re-invite via OTP)" → `resetUserPassword`.
- `components/admin/users/ConfirmActionDialog.tsx` — reusable `AlertDialog` for delete / disable / enable confirmations.

### 4.8 Login OTP first-login flow (`pages/auth/login/`, `components/auth/login/`)
- `pages/auth/login/index.tsx` (MODIFY): hold `setupEmail: string|null`. When `null` render `<LoginForm onSetupRequired={setSetupEmail}/>`; when set render `<OtpSetupForm email={setupEmail} onBack={()=>setSetupEmail(null)}/>` (keep the BrandPanel split-screen + ModeToggle).
- `components/auth/login/hooks/useLoginForm.ts` (MODIFY): in the `catch`, if `err instanceof ApiError && err.code === "PASSWORD_SETUP_REQUIRED"` → `await requestSetupOtp({emailid:email})` then `props.onSetupRequired(email)`; if `err.code === "ACCOUNT_DISABLED"` → show disabled message.
- `components/auth/login/OtpSetupForm.tsx` (new): shadcn `InputOTP` (6 digits) + new password + confirm password; "Resend code" (throttled); submit → `useOtpSetup`. On success → `loginSuccess(toSessionUser(authUser))` + navigate `/home`.
- `components/auth/login/hooks/useOtpSetup.ts` (new): form state + `confirmSetup` + `requestSetupOtp` (resend); maps errors (invalid/expired OTP, weak password).
- `types/auth/login-ui.ts` (MODIFY): add `onSetupRequired`, `LoginRouteState`, `UseOtpSetupResult` etc.

### 4.9 UI/UX quality bar (NO AI slop)
Neat, compact, professional, dense-but-legible. Reuse the established navy/gold language + shadcn primitives. Proper spacing rhythm, aligned columns, real loading/empty/error states, accessible (labels, focus rings, aria, ≥4.5:1 contrast), responsive. Selects/filters use backend options (≤200) with debounced server search. Files ≤250 lines; types in `types/`; no API calls inside components (use the hook).

---

## 5. Task breakdown (phased; each task = distinct files against the contract above)

**Phase B1 — Backend foundation/contract** (model, config, errors, otp, email, auth_deps, schemas, seed) ·
**B2 — Backend services + utils** (admin_user/*, auth otp_request/setup_confirm, login modify) ·
**B3 — Backend integration** (controllers, routes, aggregator) · **B4 — Backend tests**.

**Phase F1 — Frontend foundation** (client patch/delete, types, api modules, selectors, AdminRoute, AsyncCombobox+hook, nav-items) ·
**F2 — Frontend features** (page, table, toolbar, pagination, badge, row-actions, 4 dialogs, confirm, hook, OTP form, login-hook modify) ·
**F3 — Frontend integration** (App.tsx route, AppSidebar admin group, login page wiring).

**Phase V — Verification**: `cd backend && ./.venv/bin/python -m pytest -q` ; `cd frontend && npm run build && npm run lint`. Fix until green; 12 pre-existing shadcn-only lint errors are the accepted baseline.

## 6. Definition of done
- Admin sees "Administrator Config → User Management"; non-admins do not.
- Admin can list (paginated, sorted, searched, status/role-filtered), create (→invited, null password),
  view, edit, change-password, enable/disable, delete users (with self/last-admin guards).
- New user login → OTP emailed (dev: logged) → enter OTP + set password → active + logged in.
- Disabled user cannot log in. AsyncCombobox fetches ≤200 backend options with server search.
- `pytest` green; `npm run build` green; only the 12 pre-existing shadcn lint errors remain.
