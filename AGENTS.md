# AGENTS.md — Agent Operating Guide

Vendor-neutral. Works with Claude Code, Cursor, Codex, and other agents.
For full detail, see `CLAUDE.md` (lifecycle) and `~/.claude/rules/mandatory-skill-protocol.mdc` (authoritative phases).

---

## 1. Read Order at Session Start

1. **`CODEX.md`** — Project decisions, known pitfalls, session log. Read this first.
2. **`CLAUDE.md`** — Project guide, stack facts, global operating rules.
3. **`macro_docs/README.md`** — Domain routing table: "when the user asks about X, use file Y".
4. **Source** — `backend/app/main.py`, `frontend/src/` actual tree (see §5).

> Always verify against source. The frontend `README.md` describes features that do not yet exist in `src/` (see §3).

---

## 2. Lifecycle Phases (brief)

Full protocol: `~/.claude/rules/mandatory-skill-protocol.mdc`. Hooks enforce all phases.

| Phase | Name | One-liner |
|-------|------|-----------|
| 0 | Session start | Read CODEX → CLAUDE → domain docs; orient via graphify + jcodemunch; search Memory MCP `project:marketing-report-automation`; surface ASSUMPTIONS. |
| 1 | Plan | Gate check (Superpowers / jcodemunch / sequential thinking / Context7); get user approval before any code. |
| 2 | Code BE | Python/FastAPI work under `backend/`. Follow backend mandatory skills. |
| 3 | Code FE | React/TypeScript work under `frontend/`. Follow 28 FE mandatory skills + 3b UI/UX pass. |
| 4 | Dead-code audit | `dead-code-and-change-audit` — your changes only, no collateral deletes. |
| 5 | Lint/security | `fix-lint-format`, `owasp-security`. Run `eslint .` and `tsc -b`. |
| 6 | Review | `code-review-and-quality` / Santa method. |
| 7 | Docs | `update-docs`. Sync any changed contracts or gotchas into `macro_docs/` and `CODEX.md`. |

Phases 4–7 are **always sequential** after any coding task.

---

## 3. Project-Specific MUSTs

### Python / Backend
- **Always** use `backend/.venv`. Never the system Python.
  ```bash
  # correct
  backend/.venv/bin/python  |  backend/.venv/bin/pip
  # wrong
  python3  |  pip3  (system)
  ```
- `pandas` and `openpyxl` are **not installed** in the venv by default.
  Install when needed: `pip3 install --break-system-packages openpyxl` (add `pandas` separately).

### Frontend
- **No client-side filtering of server data.** All filter/sort/pagination goes to the backend.
- **Types** live in `src/types/<domain>/`. Do not scatter them across components.
- **API calls** are centralized in `src/lib/api.ts`. Never call the backend directly from a component.
- **API envelope shape** (follow exactly):
  - Success: `{ success: true, data, message, meta }`
  - Error: `{ success: false, error: { code, message, details } }`
  - Pagination: `page=1 limit=20 max=100 sortBy=createdAt sortOrder=desc` (whitelist sort keys).
- No file over 250 lines; split components over 200 lines.
- Semantic design tokens only (shadcn oklch tokens: `--primary`, `--destructive`, `--sidebar`, …; JSW brand tokens are not yet defined). Min contrast 4.5:1.

### lean-ctx tools (mandatory)
Use lean-ctx MCP tools **instead of** native Read / Grep / Shell:

| Native | Use instead |
|--------|-------------|
| `Read` / `cat` | `ctx_read(path, mode)` |
| `Grep` / `rg` | `ctx_search(pattern, path)` |
| `Shell` / `bash` | `ctx_shell(command)` |
| `ls` / `find` | `ctx_tree(path, depth)` |

### Domain data gotchas (from macro_docs/)
1. **ZSD invalid XML** — `ZSD_CURRSTK_HR.xlsx` contains the cell value `"1.057.000"` (two decimal points). `openpyxl.load_workbook()` raises `ValueError: could not convert string to float` in both read-only and normal mode. Fix: re-save in Excel/LibreOffice, **or** raw-parse the ZIP (`xl/sharedStrings.xml` + `xl/worksheets/sheet1.xml`) and keep non-floatable numeric strings as `str`.
2. **Two-space filename** — the customer-codes file is `macro_files/west  central customer codes.xlsx` (two spaces). Quote the path exactly; glob patterns may miss it.
3. **Text-stored numerics** — Many ZSD columns (`Act.Thickness (mm)`, `Width (mm)`, `Length(mm)`, `HARDNESS`, `YIELD STRENGTH`, `UTS`) are stored as TEXT. Cast to numeric before math. `LC Exp Date` is text `dd.mm.yyyy`.
4. **Credit report junk** — Has `#VALUE!` Excel errors and ~22 trailing blank/footer rows. Drop them before analysis.
5. **Casing not normalized** — `oem` vs `OEM`; `Mumbai` vs `mumbai`. Headers may have trailing spaces (e.g. `"CAM "`). Strip and `.lower()` before joins.
6. **Join key** — SAP customer code links all three files. In ZSD the `Party Code` column is zero-padded 10-digit; strip leading zeros to match `Customer` in the credit report. Codes `8451–8499` / `8001`-style are internal JSW stock-transfer yards, not external customers.

### Frontend scaffold — verify before referencing
`src/` is currently minimal. These do **not exist** yet — don't reference them until built:
- `src/features/ping/pingSlice.ts` and its `sendPing` thunk — **absent**.
- `src/components/layout/DashboardLayout.tsx` — **absent**.
- `src/components/jsw-logo.tsx` — **absent**.
- A Ping-Pong / data card on the home screen — **absent**.

The frontend changes often (`README.md` + `index.css` were edited during setup), so always verify a file exists in `src/` (`ctx_tree frontend/src 4`) before relying on any doc.

---

## 4. Commands Quick-Reference

```bash
# Backend — one-shot start
cd backend && ./run.sh
# (or manually)
cd backend && ./.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Backend — first-time setup
cd backend
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt

# Frontend — dev server (port 5173)
cd frontend && npm run dev

# Frontend — type-check + production build
cd frontend && npm run build

# Frontend — lint
cd frontend && npm run lint

# Frontend — preview production build (port 4173)
cd frontend && npm run preview
```

The Vite dev proxy forwards `/api/*` to the backend. Override the base URL with `VITE_API_URL`.

---

## 5. Where Things Live

### Backend (`backend/`)
| Path | What |
|------|------|
| `app/main.py` | FastAPI app — all routes: `/`, `/health`, `/ping`, `/ws/ping` |
| `app/__init__.py` | `__version__` string |
| `requirements.txt` | Fully pinned dependencies (Python 3.13 / FastAPI 0.136.3) |
| `run.sh` | Convenience launcher (uses `.venv`) |
| `.venv/` | Local virtualenv — **not committed**, recreate from `requirements.txt` |

### Frontend (`frontend/src/`)
| Path | What |
|------|------|
| `main.tsx` | React entry point |
| `App.tsx` | Router setup: `/login`, `/home`, `/` → `/home`, `*` → `/home` |
| `index.css` | shadcn/ui oklch tokens (`--primary`, `--destructive`, `--sidebar`, …) + Geist font in `:root` + `.dark`; no JSW-specific tokens yet |
| `app/store.ts` | Redux store |
| `app/hooks.ts` | Typed `useAppDispatch` / `useAppSelector` |
| `features/auth/authSlice.ts` | Only slice present: `loginSuccess` / `logout`, persisted to `localStorage` |
| `lib/api.ts` | Centralized backend client |
| `lib/utils.ts` | `cn()` helper (clsx + tailwind-merge) |
| `routes/ProtectedRoute.tsx` | Redirects to `/login` when `auth.isAuthenticated` is false |
| `pages/LoginPage.tsx` | Public login page (mock auth — any non-empty credentials accepted) |
| `pages/HomePage.tsx` | Protected dashboard home |
| `components/theme-provider.tsx` | `ThemeProvider` (light/dark via next-themes) |
| `components/ui/*.tsx` | ~55 shadcn/ui components (Radix-based) |
| `hooks/use-mobile.ts` | Mobile breakpoint hook |

### Domain data (`macro_docs/` + `macro_files/`)
| File | Grain | Use for |
|------|-------|---------|
| `credit report.XLSX` | customer × credit control area (195 rows × 33 cols) | Credit limit, exposure, overdue, credit block |
| `west  central customer codes.xlsx` | Customer master (77 rows × 12 cols) — note two spaces in name | CAM, contact, segment, route/destination |
| `ZSD_CURRSTK_HR.xlsx` | Physical coil/batch (17,324 rows × 72 cols) — see XML gotcha above | Stock/inventory, chemistry, mechanical props, aging, logistics |

See `macro_docs/README.md` for the request-routing table, and per-file docs `credit-report.md`, `west-central-customer-codes.md`, `zsd-currstk-hr.md`.
