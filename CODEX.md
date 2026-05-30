# Project Codex — Marketing Report Automation

_Last updated: 2026-05-29 | Sessions: 1 | Auto-maintained by agent sessions_

> **AGENTS: Read this file FIRST before any code work.** It captures live architectural decisions, failure history, and fragile areas. After reading, check Memory MCP (`mcp__memory__search_nodes("frontend#bd1f58419d")`) for session-level entities, then read domain docs in `macro_docs/`.

---

## Architecture Decisions

- **[2026-05-30]** Backend restructured to the **mandatory layered architecture** (all 27 backend craft skills). Layers under `backend/app/`: `routes/` (APIRouter registration per domain + `__init__.py` aggregator `api_router`) → `controllers/` (thin: validated input → service → envelope) → `services/<domain>/<action>.py` (business logic + DB, transport-free, raise typed errors) → `schemas/` (Pydantic I/O DTOs = the typed contract) → `models/` (Beanie). Cross-cutting in `core/`: `config`, `database`, `security`, `errors` (`AppError` taxonomy), `responses` (`SuccessEnvelope`/`ErrorEnvelope`/`success()`), `exception_handlers` (centralized → error envelope). `main.py` is now an app factory (`create_app()`). Every JSON endpoint returns `{success,data,message,meta}` / `{success:false,error:{code,message,details}}`; list endpoints (`GET /users`) are backend-driven paginated with a `Literal` sort whitelist (`maxLimit=100`). Domains: **meta** (`/`,`/health`,`/ping`,`/ws/ping`), **auth** (`POST /auth/login` — verifies bcrypt, stamps `lastlogined`, generic 401), **user** (`GET /users` + seed). Flat `app/{config,db,security,seed}.py` were removed — moved into `core/` + `services/user/seed.py`; seed CLI is now `python -m app.scripts.seed`. **Rule: every backend change applies the full backend skill set; mirror this structure for new domains.** Every file ≤250 lines.
- **[2026-05-30]** Backend gained a **MongoDB persistence layer** (supersedes the "No DB" note below). Beanie 2.1.0 ODM over `pymongo.AsyncMongoClient` — **Beanie 2.x retired Motor**, do not add `motor`. Connection `mongodb://localhost:27017`, DB `marketing_report` (env-overridable: `MONGODB_URI` / `MONGODB_DB`). First model `User` (collection `users`): `emailid` (unique-indexed `EmailStr`, login key), `password` (**bcrypt hash — never plaintext**), `lastlogined` (`datetime|None`), `isAdmin` (`bool`). DB code is modular — `app/config.py`, `app/db.py`, `app/models/user.py`, `app/security.py`, `app/seed.py` — never in `main.py`. Connect + idempotent seed run from the `main.py` `lifespan` hook; startup tolerates Mongo being down (logs, does not crash) so ping/health still boot. Seed admin `ajayirkal@docketrun.com` (bcrypt-hashed pw) created on startup and via `./.venv/bin/python -m app.seed`.
- **[2026-05-29]** Minimal FastAPI ping->pong backend (`backend/app/main.py`) used as the API seed/scaffold. No DB, no services layer, no auth yet. Extend here when backend logic is needed.
- **[2026-05-29]** Frontend is Vite 8 + React 19 + TypeScript ~6.0. All new UI work targets this stack — do not introduce a separate framework or meta-framework.
- **[2026-05-29]** Redux Toolkit 2 chosen for all client state. Auth slice (`src/features/auth/authSlice.ts`) is the only slice currently present. Context-based auth was rejected — do not add it.
- **[2026-05-29]** Tailwind CSS v4 (`@tailwindcss/vite` plugin) + shadcn/ui (radix-ui, ~55 components in `src/components/ui/`) for all UI primitives. Do not add a separate component library.
- **[2026-05-29]** Mock auth accepts any non-empty credentials and persists session to `localStorage`. This is a placeholder — real auth must replace it before production. The current flow: `loginSuccess` / `logout` actions on `authSlice`, `ProtectedRoute` redirects to `/login` when `auth.isAuthenticated` is false.
- **[2026-05-29]** Vite dev server proxies `/api/*` to `http://localhost:8000`. Override the base URL with the `VITE_API_URL` environment variable. CORS on the backend allows `localhost:5173`, `127.0.0.1:5173`, and `localhost:4173` only.

---

## Patterns We Use (and WHY)

| Concern | Pattern | Why / Do NOT |
|---|---|---|
| **Auth state** | Redux Toolkit `authSlice` hydrated from `localStorage` | Single source of truth across reloads. Do NOT add a React context for auth. |
| **API calls** | Centralized in `src/lib/api.ts` | No `fetch`/`axios` calls inside components. All requests go through the api module. |
| **Backend startup** | Always `./run.sh` or `./.venv/bin/uvicorn app.main:app ...` | The venv is gitignored. Never use system Python or a globally installed uvicorn. |
| **UI components** | shadcn primitives from `src/components/ui/` | Consistent design and accessibility. Do not import radix-ui primitives directly in page code — wrap them via shadcn. |
| **Design tokens** | `src/index.css` uses shadcn/ui oklch tokens (`--primary`, `--destructive`, `--sidebar`, …) + the Geist font. JSW brand tokens (`--jsw-blue` / `--jsw-red` / `--jsw-steel`) are **not yet defined**. | Theming via `ThemeProvider` (`src/components/theme-provider.tsx`). Add JSW tokens before referencing them; use token names, not raw hex. |
| **Typed Redux hooks** | `useAppDispatch` / `useAppSelector` from `src/app/hooks.ts` | Avoid raw `useDispatch`/`useSelector` — typed hooks prevent silent type errors. |
| **Slice location** | `src/features/<domain>/<domain>Slice.ts` | Mirrors the Redux Toolkit feature-folder convention. |
| **Page components** | `src/pages/<Name>Page.tsx` | Consistent discovery for routing. Routes defined in `src/App.tsx`. |

---

## Things We Tried That Failed

- **[2026-05-29]** `openpyxl.load_workbook("macro_files/ZSD_CURRSTK_HR.xlsx")` raises `ValueError: could not convert string to float` on a cell containing `"1.057.000"` (invalid numeric). Fails in both normal and read-only mode. **Fix:** re-save the file in Excel or LibreOffice first, OR raw-parse the xlsx zip (extract `xl/sharedStrings.xml` + `xl/worksheets/sheet1.xml`) keeping non-floatable numeric cells as strings.
- **[2026-05-29]** The frontend is an evolving scaffold — `src/` has no ping/data slice, no `DashboardLayout`, and no logo component yet. During setup `frontend/README.md` and `src/index.css` were edited live, so any doc can lag the tree. Always confirm a file exists in `src/` before referencing it (`ctx_tree frontend/src 4`).

---

## Known Fragile Areas

- **`macro_files/ZSD_CURRSTK_HR.xlsx`** — Contains invalid XML (cell `"1.057.000"`). `openpyxl` will crash on load. See "Things We Tried" above for the fix procedure. This file has 17,324 rows x 72 columns and many numeric columns stored as TEXT (`Act.Thickness (mm)`, `Width (mm)`, `Length(mm)`, `HARDNESS`, `YIELD STRENGTH`, `UTS`, `LC Exp Date`). Cast explicitly before arithmetic.
- **`macro_files/west  central customer codes.xlsx`** — Two spaces in the filename (copy the name exactly). Headers have trailing spaces (e.g., `"CAM "`). The last 1-2 columns are unnamed junk — drop them after load.
- **`macro_files/credit report.XLSX`** — Contains `#VALUE!` Excel errors (e.g., `Validity Period End`) and approximately 22 trailing blank/footer rows. Strip before processing.
- **`backend/.venv/`** — Gitignored. Must be recreated: `cd backend && python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt`. Never commit the venv.
- **CORS origins (`backend/app/main.py`)** — Hardcoded list: `localhost:5173`, `127.0.0.1:5173`, `localhost:4173`. Any new frontend origin (staging, preview) must be added here explicitly.
- **MongoDB / Beanie 2.x** — Local `mongod` runs on `127.0.0.1:27017` (`/etc/mongod.conf`, `bindIp: 127.0.0.1`). Beanie 2.x uses `pymongo.AsyncMongoClient`, **not Motor** (`import motor` fails — don't add it). `AsyncMongoClient.close()` is a coroutine (`await`). Startup seed is idempotent on unique `emailid`; if you change the seed password, the existing doc is NOT updated (delete it first or add an upsert path). `password` is a bcrypt hash — verify with `app.security.verify_password`, never compare plaintext.
- **pandas/openpyxl not pre-installed** — Neither is available by default in this environment. Install: `pip3 install --break-system-packages openpyxl` (add `pandas` if needed).
- **Customer code join key** — SAP Party Code in `ZSD_CURRSTK_HR.xlsx` is zero-padded to 10 digits. Strip leading zeros before joining to the 8-digit customer codes in the other two files. Short codes `8451–8499` / `8001`-style are internal JSW stock-transfer yards — not external customers.

---

## Naming Conventions

| Layer | Convention | Example |
|---|---|---|
| FE components | PascalCase `.tsx` | `LoginPage.tsx`, `ThemeProvider.tsx` |
| Redux slices | `src/features/<domain>/<domain>Slice.ts` | `src/features/auth/authSlice.ts` |
| Pages | `src/pages/<Name>Page.tsx` | `src/pages/HomePage.tsx` |
| shadcn primitives | `src/components/ui/<name>.tsx` | `src/components/ui/button.tsx` |
| Redux hooks | `src/app/hooks.ts` (typed) | `useAppDispatch`, `useAppSelector` |
| BE modules | `snake_case`, inside `backend/app/` | `main.py`, `__init__.py` |
| BE pydantic models | `<Name>Response` | `PongResponse`, `HealthResponse` |
| Domain data docs | `macro_docs/<slug>.md` | `macro_docs/zsd-currstk-hr.md` |

---

## Memory Bootstrap Refs

- **Memory MCP entity slug:** `frontend#bd1f58419d` (3 seeded entities). Query at session start: `mcp__memory__search_nodes("frontend#bd1f58419d")`.
- **File-based memory index:** `MEMORY.md` in the project root (session memory dir). Read alongside this CODEX.
- **Domain routing table:** `macro_docs/README.md` — maps user question types to the correct source file (`credit report.XLSX` / `west  central customer codes.xlsx` / `ZSD_CURRSTK_HR.xlsx`).
- **Per-file data dictionaries:** `macro_docs/credit-report.md`, `macro_docs/west-central-customer-codes.md`, `macro_docs/zsd-currstk-hr.md`.

---

## Session Log (last 10 sessions)

- **[2026-05-30]** Restructured the backend into the mandatory layered architecture (routes/controllers/services/schemas/models + core/) per all 27 backend craft skills; replaced the flat `app/{config,db,security,seed}.py` with `core/` modules + `services/user/seed.py`. `main.py` → `create_app()` factory with CORS, centralized exception handlers, and the Mongo lifespan. Added domains **auth** (`POST /auth/login`) and **user** (`GET /users`, paginated). Made `.env` live (removed `.env.example`); seed CLI is `python -m app.scripts.seed`. Verified end-to-end via TestClient: envelopes on all JSON endpoints, login success/401/validation paths, list pagination + sort whitelist (unknown `sortBy` rejected), `lastlogined` stamped on login. All files ≤250 lines. Updated `backend/CLAUDE.md`.
- **[2026-05-30]** Added MongoDB to the backend: Beanie 2.1.0 (`pymongo.AsyncMongoClient`) + bcrypt + email-validator deps; `main.py` lifespan wires connect + idempotent admin seed (tolerant of Mongo being down). Froze `requirements.txt`. Created `User` model + seeded admin `ajayirkal@docketrun.com` (bcrypt-hashed). Verified: seed idempotent, stored hash verifies against the password, unique `emailid` index present, ping/health still boot.
- **[2026-05-29]** Initialized Claude workflow files: root `CLAUDE.md`, `CODEX.md`, `AGENTS.md`, `frontend/CLAUDE.md`, `backend/CLAUDE.md`, `.planning/` GSD scaffold (`PROJECT` / `STATE` / `ROADMAP` / intel), and `MEMORY.md` index. Corrected JSW-token and stale-file claims after `frontend/README.md` + `src/index.css` were changed mid-run; docs now match the live `src/` tree.
