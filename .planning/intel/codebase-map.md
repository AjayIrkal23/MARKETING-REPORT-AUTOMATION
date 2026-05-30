# Codebase Map — Marketing Report Automation

> **Auto-generated intel** — 2026-05-29. Reflects the actual `src/` tree verified at scaffold time.
> Re-run after significant structural changes.

---

## Repository Layout

```
/DATA/CODE_FILES/MARKETING REPORT AUTOMATION/
├── backend/                  FastAPI service (Python 3.13)
├── frontend/                 Vite 8 + React 19 dashboard
├── macro_docs/               Data dictionary (markdown, written for AI agents)
├── macro_files/              Source SAP Excel exports (3 files)
├── README.md                 Project overview + quickstart
└── .claude/settings.local.json
```

---

## Backend (`backend/`)

### Entry point

`backend/app/main.py` — FastAPI app, title `"JSW Ping-Pong API"`, version from `app/__init__.py`.

### Endpoints

| Method | Path | Response model | Notes |
|--------|------|----------------|-------|
| `GET` | `/` | `dict` | Service banner |
| `GET` | `/health` | `HealthResponse` | `{status, version, uptime_seconds}` |
| `GET` | `/ping` | `PongResponse` | `{message="pong", seq, timestamp}`; seq via `itertools.count(1)` |
| `WS` | `/ws/ping` | — | `"ping"` → `"pong"`; anything else → `"echo:<text>"` |

### Models (`app/main.py`)

- `PongResponse` — `message: str`, `seq: int`, `timestamp: str` (ISO UTC via `_now_iso()`)
- `HealthResponse` — `status: str`, `version: str`, `uptime_seconds: float`

### CORS

Allowed origins: `http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:4173`. Credentials allowed; methods/headers `"*"`.

### File tree

```
backend/
├── app/
│   ├── __init__.py       (__version__)
│   └── main.py           FastAPI app + all endpoints
├── requirements.txt      Fully pinned (FastAPI 0.136.3, Pydantic 2.13.4, Uvicorn 0.48.0)
├── run.sh                exec .venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
└── .gitignore            excludes .venv/ __pycache__ *.pyc .pytest_cache .env
```

> **Note:** `.venv/` is NOT committed. Recreate with `python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt`.

---

## Frontend (`frontend/`)

### Stack

Vite 8, React 19.2, TypeScript ~6.0, Tailwind CSS v4 (`@tailwindcss/vite`), shadcn/ui, Redux Toolkit 2, react-router-dom 7, recharts 3, lucide-react, sonner, next-themes, date-fns, embla-carousel, vaul, cmdk, input-otp.

### Scripts

| Script | Command |
|--------|---------|
| `dev` | `vite` (port 5173) |
| `build` | `tsc -b && vite build` |
| `lint` | `eslint .` |
| `preview` | `vite preview` (port 4173) |

`/api/*` is proxied to the backend in `vite.config.ts`. Override base with `VITE_API_URL`.

### Actual `src/` tree

```
src/
├── app/
│   ├── store.ts          Redux store
│   └── hooks.ts          useAppDispatch / useAppSelector
├── features/
│   └── auth/
│       └── authSlice.ts  loginSuccess / logout; hydrated from localStorage
├── pages/
│   ├── LoginPage.tsx
│   └── HomePage.tsx
├── routes/
│   └── ProtectedRoute.tsx  redirects to /login when auth.isAuthenticated is false
├── components/
│   ├── theme-provider.tsx  ThemeProvider (light/dark)
│   └── ui/                 ~55 shadcn/ui components
├── hooks/
│   └── use-mobile.ts
├── lib/
│   ├── api.ts             Backend HTTP client
│   └── utils.ts           cn() helper
├── App.tsx
├── main.tsx
└── index.css             shadcn/ui oklch tokens (--primary, --destructive, --sidebar, ...) + Geist font; no JSW tokens yet
```

### Routes

| Path | Component | Access |
|------|-----------|--------|
| `/login` | `LoginPage` | Public |
| `/home` | `HomePage` | Protected (`ProtectedRoute`) |
| `/` | — | Redirects to `/home` |
| `*` | — | Redirects to `/home` |

### Auth

Mock auth accepts any non-empty username + password. `loginSuccess` action stores credentials in Redux state and `localStorage`. `logout` clears both. `ProtectedRoute` checks `auth.isAuthenticated`.

### Scaffold gaps (known gotcha)

`src/` is currently minimal — these are **not present yet** (don't reference until built):

| Component | Actual status |
|-----------------|---------------|
| `src/features/ping/pingSlice.ts` (sendPing thunk) | **Does not exist** |
| Ping-Pong / data card on dashboard | **Does not exist** |
| `src/components/layout/DashboardLayout.tsx` | **Does not exist** |
| `src/components/jsw-logo.tsx` | **Does not exist** |

> The frontend changes often (`README.md` + `index.css` were edited mid-setup on 2026-05-29). Future agents: verify the live `src/` tree before relying on any doc.

---

## Domain Data (`macro_files/` + `macro_docs/`)

### Source files

| File | Rows × Cols | Primary use |
|------|-------------|-------------|
| `macro_files/credit report.XLSX` | 195 × 33 | Credit limit, exposure, overdue, block |
| `macro_files/west  central customer codes.xlsx` | 77 × 12 | CAM, contact, segment, route (note: **two spaces** in filename) |
| `macro_files/ZSD_CURRSTK_HR.xlsx` | 17,324 × 72 | Physical coil inventory, chemistry, mechanical props, NCO/rework |

### Documentation

```
macro_docs/
├── README.md                       Request-routing table ("ask about X → use file Y")
├── credit-report.md                Column dictionary for credit report
├── west-central-customer-codes.md  Column dictionary for customer master
└── zsd-currstk-hr.md               Column dictionary for stock file
```

### Critical data gotchas (summary)

1. **ZSD invalid XML** — `"1.057.000"` cell causes `openpyxl.load_workbook()` to crash. Use raw-ZIP parse or re-save the file.
2. **TEXT numeric columns** — `Act.Thickness (mm)`, `Width (mm)`, `Length(mm)`, `HARDNESS`, `YIELD STRENGTH`, `UTS`, `LC Exp Date` stored as strings; cast before arithmetic.
3. **Credit `#VALUE!` errors** — present in `Validity Period End` and others; ~22 trailing blank/footer rows must be dropped.
4. **Casing inconsistency** — `oem` vs `OEM`, `Mumbai` vs `mumbai`; normalise on ingest.
5. **Header trailing spaces** — e.g. `"CAM "`. Strip all column names on load.
6. **Join key** — ZSD `Party Code` is zero-padded 10-digit; strip leading zeros to match `Customer` in other files. Codes 8451–8499 and 8001-style = internal yards, not external customers.
7. **openpyxl not installed** — `pip3 install --break-system-packages openpyxl` required before any parsing.
