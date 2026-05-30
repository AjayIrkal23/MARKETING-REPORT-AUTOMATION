# Marketing Report Automation — CLAUDE.md

JSW Steel marketing tooling for the West-Central region. Ingests three SAP Excel exports (credit, customer master, current stock), exposes a FastAPI backend, and serves a Vite + React dashboard. Currently in scaffold stage — backend is a minimal ping-pong API and the frontend has auth + routing wired but no domain screens yet.

---

## Read first

> **Agents: read `CODEX.md` before touching any source file.**
> This `CLAUDE.md` + `AGENTS.md` carry project-specific rules.
> The global agent lifecycle (phases 0–7, lean-ctx, skill hooks) lives in
> `~/.claude/rules/mandatory-skill-protocol.mdc` — do not duplicate it here.

---

## Repo layout

| Path | Contents |
|------|----------|
| `backend/` | FastAPI ping-pong scaffold (Python 3.13, Uvicorn). Venv at `backend/.venv` — not committed. |
| `frontend/` | Vite 8 + React 19 + TypeScript dashboard. JSW-themed, auth + routing wired. |
| `macro_docs/` | Data dictionary (markdown) for the three source Excel files — written for AI agents. |
| `macro_files/` | The three SAP Excel source reports (credit, customer codes, current stock). |
| `README.md` | Project overview and quickstart. |

---

## Commands

### Backend (port 8000)

```bash
cd backend
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt
./run.sh          # runs uvicorn --reload --host 0.0.0.0 --port 8000
```

- API docs: http://localhost:8000/docs
- Always use `backend/.venv` — never the system Python.
- `run.sh` is self-contained (`cd`s to its own directory before exec).

### Frontend (port 5173)

```bash
cd frontend
npm install
npm run dev       # Vite dev server :5173, /api/* proxied to :8000
npm run build     # tsc -b && vite build
npm run lint      # eslint .
npm run preview   # Vite preview :4173
```

Override backend URL: `VITE_API_URL=http://...` (see `vite.config.ts` proxy config).

---

## Architecture at a glance

### Backend — minimal FastAPI scaffold

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Service banner dict |
| `/health` | GET | `HealthResponse` — status, version, uptime_seconds |
| `/ping` | GET | `PongResponse` — message="pong", seq, timestamp |
| `/ws/ping` | WS | Echo: "ping" → "pong"; anything else → `echo:<text>` |

- Models: `PongResponse`, `HealthResponse` (Pydantic v2 BaseModel). Counter via `itertools.count(1)`.
- CORS origins: `http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:4173`; credentials allowed.
- Entry: `backend/app/main.py`. Version from `backend/app/__init__.py`.
- **No DB, no services layer, no auth yet** — this is a scaffold.

### Frontend — auth + routing, no domain screens yet

**Redux Toolkit:**
- Store: `src/app/store.ts` + typed hooks `src/app/hooks.ts`.
- Only slice present: `src/features/auth/authSlice.ts` — `loginSuccess` / `logout` actions, session hydrated from `localStorage`.

**React Router v7 routes:**

| Path | Component | Guard |
|------|-----------|-------|
| `/login` | `LoginPage` | Public |
| `/home` | `HomePage` | `ProtectedRoute` (redirects to `/login` if not authenticated) |
| `/` | redirect → `/home` | — |
| `*` | redirect → `/home` | — |

Mock auth accepts **any non-empty credentials** and persists to `localStorage`.

**Styling:**
- Tailwind CSS v4 (`@tailwindcss/vite`). `src/index.css` defines standard shadcn/ui oklch tokens (`--primary`, `--destructive`, `--sidebar`, …) plus the Geist Variable font in `:root` + `.dark`. **JSW-specific brand tokens (`--jsw-blue` / `--jsw-red` / `--jsw-steel`) are not yet defined — add them before referencing.**
- shadcn/ui (~55 components under `src/components/ui/`), `next-themes` `ThemeProvider`.
- Backend client: `src/lib/api.ts`. Utility: `src/lib/utils.ts` (`cn` helper).

**Frontend is still a scaffold — known gotcha:** `src/` currently has only the auth slice, routing, `theme-provider`, and the shadcn `ui/` set. There is **no** ping/data slice, dashboard-layout component, or logo component yet. The frontend changes frequently (`README.md` and `index.css` were edited mid-setup on 2026-05-29), so always verify against the live `src/` tree (`ctx_tree frontend/src 4`) before referencing a file.

---

## Domain data

Three SAP Excel exports live in `macro_files/` and are documented in `macro_docs/`. The primary join key across all three is the SAP customer code (8-digit, e.g. `40000088`). In ZSD the `Party Code` column is zero-padded to 10 digits — strip leading zeros to match. Short codes in the 8451–8499 / 8001-style range are internal JSW stock-transfer yards, not external customers. Full column-level data dictionary, field semantics, and request-routing table ("when the user asks about X, use file Y") are in `macro_docs/README.md`.

### Three critical gotchas

1. **`openpyxl` not installed by default.** Install before any Excel work:
   ```bash
   pip3 install --break-system-packages openpyxl   # add pandas if needed
   ```

2. **ZSD invalid-XML `ValueError`.** `ZSD_CURRSTK_HR.xlsx` contains a numeric cell with value `"1.057.000"` (two decimal points). `openpyxl.load_workbook()` raises `ValueError: could not convert string to float` in **both** read-only and normal mode. Fix: re-save the file in Excel or LibreOffice, OR raw-parse the zip (`xl/sharedStrings.xml` + `xl/worksheets/sheet1.xml`) and keep non-floatable numeric cells as strings.

3. **Two-space filename.** The customer codes file is named `west  central customer codes.xlsx` (two spaces between "west" and "central"). Shell globs and string literals must match exactly.

Additional data-quality issues (not exhaustive): many ZSD numeric columns stored as TEXT (`Act.Thickness (mm)`, `Width (mm)`, `HARDNESS`, `YIELD STRENGTH`, `UTS`); `LC Exp Date` is text in `dd.mm.yyyy` format; credit report has `#VALUE!` Excel errors and ~22 trailing blank/footer rows; casing is not normalized (`oem` vs `OEM`, `Mumbai` vs `mumbai`); some column headers have trailing spaces (e.g. `"CAM "`); last 1–2 columns of the customer-codes file are unnamed junk.

---

## Conventions and guardrails

**Global (from `~/.claude/rules/mandatory-skill-protocol.mdc`):**
- Phases 0–7: Session start → Plan → Code BE → Code FE (+UI/UX) → Dead-code audit → Lint/security → Review → Docs. Phases 4–7 run sequentially after every coding task.
- Phase 0: read `CODEX.md` first; orient with graphify + jcodemunch; search Memory MCP `project:marketing-report-automation`; read domain docs; list impacted layers; surface `ASSUMPTIONS I AM MAKING:`.
- `lean-ctx` MCP tools are mandatory — never use native `Read`/`Grep`/`Shell` directly.
- API envelope: `{success, data, message, meta}` on success; `{success:false, error:{code, message, details}}` on error. Pagination: `page=1 limit=20 max=100`, default sort `createdAt desc`, whitelist sort keys.
- Frontend: no client-side filtering of server data; types in `src/types/<domain>/`; API calls centralized (currently `src/lib/api.ts`, move to `src/api/<domain>/` as domains grow); no API calls inside components; semantic design tokens, ≥4.5:1 contrast; no file >250 lines.

**Local must-knows:**
- Always activate `backend/.venv` — never use system Python.
- The frontend is under active construction (`README.md` / `index.css` were edited during setup). **Document and code against what actually exists in `src/`** — verify with `ctx_tree frontend/src 4` when in doubt.
- 28 frontend / 27 backend mandatory craft skills are enforced via hooks in `~/.claude/settings.json`. They fire automatically on file writes — do not suppress them.

---

## Pointers

| File | Purpose |
|------|---------|
| `CODEX.md` | Session log, decisions, known fragile areas — **read before source files** |
| `AGENTS.md` | Agent roles, responsibilities, and delegation rules |
| `frontend/CLAUDE.md` | Frontend-specific agent rules |
| `backend/CLAUDE.md` | Backend-specific agent rules |
| `macro_docs/README.md` | Domain data dictionary and request-routing table |
| `~/.claude/rules/mandatory-skill-protocol.mdc` | Global lifecycle (phases 0–7) — canonical source |
