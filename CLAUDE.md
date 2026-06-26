<!-- dox:root v1 -->
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

- **Backend** — FastAPI service on port 8000. See [`backend/CLAUDE.md`](backend/CLAUDE.md) for endpoints, models, and layering.
- **Frontend** — Vite + React + TypeScript dashboard on port 5173. See [`frontend/CLAUDE.md`](frontend/CLAUDE.md) for routes, state, and components.
- **Domain data** — three SAP Excel exports in [`macro_files/`](macro_files/CLAUDE.md), documented in [`macro_docs/`](macro_docs/CLAUDE.md). Key join: SAP customer code; ZSD `Party Code` is zero-padded to 10 digits — strip leading zeros. Codes `8451–8499` / `8001`-style are internal JSW yards.

## Domain data gotchas (summary)

- Report ingestion is **format-agnostic**: a shared content-detecting parser (`backend/app/utils/shared/excel.py`) reads `.xlsx`/`.xlsm` via raw-zip (`openpyxl` crashes on the malformed numeric cell `"1.057.000"`) and `.xlsb` via `pyxlsb`. Detection is by file content, not extension; file lookup (`utils/shared/resolve.py`) matches the configured stem against any Excel extension, so a `.xlsb` export is no longer reported "missing".
- Customer-codes filename has **two spaces**: `west  central customer codes.xlsx`. An updated 15-column workbook (`west  central customer codes_updated_ship_tp.xlsx`) adds a second `SHIP TO` / `SHIP TO CUSTOMER` pair plus `SHIP TO CITY`, `RAKE`, and `TRANSPORT MODE`.
- Many ZSD numeric columns are stored as TEXT; cast before math. `LC Exp Date` is `dd.mm.yyyy` text.
- Credit report has `#VALUE!` errors and trailing blank/footer rows.
- Casing and header spacing are not normalized — strip and `.lower()` before joins.

Full dictionaries and the request-routing table are in [`macro_docs/README.md`](macro_docs/README.md).

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

## dox maintenance

After changing files in any directory: (1) update that dir's `CLAUDE.md` (files,
conventions, gotchas, children); (2) re-sync the root index with
`python3 ~/.claude/hooks/dox_engine.py sweep .`; (3) keep every `CLAUDE.md` ≤ 250
lines. New dirs are auto-stubbed, but prose is manual — don't leave stubs untouched.

## Pointers

Read `CODEX.md` first, then relevant `backend/CLAUDE.md`, `frontend/CLAUDE.md`, and `macro_docs/README.md` docs.

## dox index (children)

<!-- dox:index:start -->
<!-- dox auto-syncs this block from the tree on disk; edit directories, not these lines -->
- [`backend/`](backend/CLAUDE.md)
  - [`backend/app/`](backend/app/CLAUDE.md)
    - [`backend/app/controllers/`](backend/app/controllers/CLAUDE.md)
    - [`backend/app/core/`](backend/app/core/CLAUDE.md)
    - [`backend/app/middleware/`](backend/app/middleware/CLAUDE.md)
    - [`backend/app/models/`](backend/app/models/CLAUDE.md)
    - [`backend/app/routes/`](backend/app/routes/CLAUDE.md)
    - [`backend/app/schemas/`](backend/app/schemas/CLAUDE.md)
    - [`backend/app/scripts/`](backend/app/scripts/CLAUDE.md)
    - [`backend/app/services/`](backend/app/services/CLAUDE.md)
      - [`backend/app/services/admin_user/`](backend/app/services/admin_user/CLAUDE.md)
      - [`backend/app/services/analytics/`](backend/app/services/analytics/CLAUDE.md)
      - [`backend/app/services/audit/`](backend/app/services/audit/CLAUDE.md)
      - [`backend/app/services/audit_log/`](backend/app/services/audit_log/CLAUDE.md)
      - [`backend/app/services/auth/`](backend/app/services/auth/CLAUDE.md)
      - [`backend/app/services/cleanup/`](backend/app/services/cleanup/CLAUDE.md)
      - [`backend/app/services/coil_price/`](backend/app/services/coil_price/CLAUDE.md)
      - [`backend/app/services/credit_report/`](backend/app/services/credit_report/CLAUDE.md)
      - [`backend/app/services/cron/`](backend/app/services/cron/CLAUDE.md)
      - [`backend/app/services/customer_code/`](backend/app/services/customer_code/CLAUDE.md)
      - [`backend/app/services/dashboard/`](backend/app/services/dashboard/CLAUDE.md)
      - [`backend/app/services/jsw_stock/`](backend/app/services/jsw_stock/CLAUDE.md)
      - [`backend/app/services/jvml_stock/`](backend/app/services/jvml_stock/CLAUDE.md)
      - [`backend/app/services/meta/`](backend/app/services/meta/CLAUDE.md)
      - [`backend/app/services/region/`](backend/app/services/region/CLAUDE.md)
      - [`backend/app/services/report/`](backend/app/services/report/CLAUDE.md)
      - [`backend/app/services/shared/`](backend/app/services/shared/CLAUDE.md)
      - [`backend/app/services/user/`](backend/app/services/user/CLAUDE.md)
    - [`backend/app/utils/`](backend/app/utils/CLAUDE.md)
      - [`backend/app/utils/admin_user/`](backend/app/utils/admin_user/CLAUDE.md)
      - [`backend/app/utils/audit_log/`](backend/app/utils/audit_log/CLAUDE.md)
      - [`backend/app/utils/coil_price/`](backend/app/utils/coil_price/CLAUDE.md)
      - [`backend/app/utils/credit_report/`](backend/app/utils/credit_report/CLAUDE.md)
      - [`backend/app/utils/customer_code/`](backend/app/utils/customer_code/CLAUDE.md)
      - [`backend/app/utils/jsw_stock/`](backend/app/utils/jsw_stock/CLAUDE.md)
      - [`backend/app/utils/jvml_stock/`](backend/app/utils/jvml_stock/CLAUDE.md)
      - [`backend/app/utils/region/`](backend/app/utils/region/CLAUDE.md)
      - [`backend/app/utils/report/`](backend/app/utils/report/CLAUDE.md)
      - [`backend/app/utils/shared/`](backend/app/utils/shared/CLAUDE.md)
      - [`backend/app/utils/user/`](backend/app/utils/user/CLAUDE.md)
  - [`backend/tests/`](backend/tests/CLAUDE.md)
    - [`backend/tests/fixtures/`](backend/tests/fixtures/CLAUDE.md)
- [`backend_docs/`](backend_docs/CLAUDE.md)
- [`docs/`](docs/CLAUDE.md)
  - [`docs/superpowers/`](docs/superpowers/CLAUDE.md)
    - [`docs/superpowers/plans/`](docs/superpowers/plans/CLAUDE.md)
    - [`docs/superpowers/specs/`](docs/superpowers/specs/CLAUDE.md)
- [`frontend/`](frontend/CLAUDE.md)
  - [`frontend/public/`](frontend/public/CLAUDE.md)
  - [`frontend/src/`](frontend/src/CLAUDE.md)
    - [`frontend/src/api/`](frontend/src/api/CLAUDE.md)
      - [`frontend/src/api/admin/`](frontend/src/api/admin/CLAUDE.md)
        - [`frontend/src/api/admin/audit-logs/`](frontend/src/api/admin/audit-logs/CLAUDE.md)
        - [`frontend/src/api/admin/coil-prices/`](frontend/src/api/admin/coil-prices/CLAUDE.md)
        - [`frontend/src/api/admin/customer-codes/`](frontend/src/api/admin/customer-codes/CLAUDE.md)
        - [`frontend/src/api/admin/regions/`](frontend/src/api/admin/regions/CLAUDE.md)
        - [`frontend/src/api/admin/users/`](frontend/src/api/admin/users/CLAUDE.md)
      - [`frontend/src/api/analytics/`](frontend/src/api/analytics/CLAUDE.md)
      - [`frontend/src/api/auth/`](frontend/src/api/auth/CLAUDE.md)
        - [`frontend/src/api/auth/setup/`](frontend/src/api/auth/setup/CLAUDE.md)
      - [`frontend/src/api/credit-report/`](frontend/src/api/credit-report/CLAUDE.md)
      - [`frontend/src/api/dashboard/`](frontend/src/api/dashboard/CLAUDE.md)
      - [`frontend/src/api/jsw-stock/`](frontend/src/api/jsw-stock/CLAUDE.md)
      - [`frontend/src/api/jvml-stock/`](frontend/src/api/jvml-stock/CLAUDE.md)
      - [`frontend/src/api/meta/`](frontend/src/api/meta/CLAUDE.md)
      - [`frontend/src/api/report/`](frontend/src/api/report/CLAUDE.md)
      - [`frontend/src/api/settings/`](frontend/src/api/settings/CLAUDE.md)
        - [`frontend/src/api/settings/cleanup-config/`](frontend/src/api/settings/cleanup-config/CLAUDE.md)
        - [`frontend/src/api/settings/credit-report-config/`](frontend/src/api/settings/credit-report-config/CLAUDE.md)
        - [`frontend/src/api/settings/jsw-stock-config/`](frontend/src/api/settings/jsw-stock-config/CLAUDE.md)
        - [`frontend/src/api/settings/jvml-stock-config/`](frontend/src/api/settings/jvml-stock-config/CLAUDE.md)
      - [`frontend/src/api/user/`](frontend/src/api/user/CLAUDE.md)
    - [`frontend/src/app/`](frontend/src/app/CLAUDE.md)
    - [`frontend/src/components/`](frontend/src/components/CLAUDE.md)
      - [`frontend/src/components/admin/`](frontend/src/components/admin/CLAUDE.md)
        - [`frontend/src/components/admin/audit-logs/`](frontend/src/components/admin/audit-logs/CLAUDE.md)
          - [`frontend/src/components/admin/audit-logs/hooks/`](frontend/src/components/admin/audit-logs/hooks/CLAUDE.md)
        - [`frontend/src/components/admin/coil-prices/`](frontend/src/components/admin/coil-prices/CLAUDE.md)
          - [`frontend/src/components/admin/coil-prices/hooks/`](frontend/src/components/admin/coil-prices/hooks/CLAUDE.md)
        - [`frontend/src/components/admin/customer-codes/`](frontend/src/components/admin/customer-codes/CLAUDE.md)
          - [`frontend/src/components/admin/customer-codes/hooks/`](frontend/src/components/admin/customer-codes/hooks/CLAUDE.md)
        - [`frontend/src/components/admin/regions/`](frontend/src/components/admin/regions/CLAUDE.md)
          - [`frontend/src/components/admin/regions/hooks/`](frontend/src/components/admin/regions/hooks/CLAUDE.md)
        - [`frontend/src/components/admin/users/`](frontend/src/components/admin/users/CLAUDE.md)
          - [`frontend/src/components/admin/users/hooks/`](frontend/src/components/admin/users/hooks/CLAUDE.md)
      - [`frontend/src/components/analytics/`](frontend/src/components/analytics/CLAUDE.md)
        - [`frontend/src/components/analytics/charts/`](frontend/src/components/analytics/charts/CLAUDE.md)
        - [`frontend/src/components/analytics/hooks/`](frontend/src/components/analytics/hooks/CLAUDE.md)
      - [`frontend/src/components/auth/`](frontend/src/components/auth/CLAUDE.md)
        - [`frontend/src/components/auth/hooks/`](frontend/src/components/auth/hooks/CLAUDE.md)
        - [`frontend/src/components/auth/login/`](frontend/src/components/auth/login/CLAUDE.md)
          - [`frontend/src/components/auth/login/hooks/`](frontend/src/components/auth/login/hooks/CLAUDE.md)
      - [`frontend/src/components/common/`](frontend/src/components/common/CLAUDE.md)
        - [`frontend/src/components/common/hooks/`](frontend/src/components/common/hooks/CLAUDE.md)
      - [`frontend/src/components/credit-report/`](frontend/src/components/credit-report/CLAUDE.md)
        - [`frontend/src/components/credit-report/hooks/`](frontend/src/components/credit-report/hooks/CLAUDE.md)
      - [`frontend/src/components/dashboard/`](frontend/src/components/dashboard/CLAUDE.md)
        - [`frontend/src/components/dashboard/hooks/`](frontend/src/components/dashboard/hooks/CLAUDE.md)
      - [`frontend/src/components/jsw-stock/`](frontend/src/components/jsw-stock/CLAUDE.md)
        - [`frontend/src/components/jsw-stock/hooks/`](frontend/src/components/jsw-stock/hooks/CLAUDE.md)
      - [`frontend/src/components/jvml-stock/`](frontend/src/components/jvml-stock/CLAUDE.md)
        - [`frontend/src/components/jvml-stock/hooks/`](frontend/src/components/jvml-stock/hooks/CLAUDE.md)
      - [`frontend/src/components/layout/`](frontend/src/components/layout/CLAUDE.md)
      - [`frontend/src/components/report/`](frontend/src/components/report/CLAUDE.md)
        - [`frontend/src/components/report/hooks/`](frontend/src/components/report/hooks/CLAUDE.md)
      - [`frontend/src/components/settings/`](frontend/src/components/settings/CLAUDE.md)
        - [`frontend/src/components/settings/hooks/`](frontend/src/components/settings/hooks/CLAUDE.md)
      - [`frontend/src/components/shared/`](frontend/src/components/shared/CLAUDE.md)
      - [`frontend/src/components/theme/`](frontend/src/components/theme/CLAUDE.md)
      - [`frontend/src/components/ui/`](frontend/src/components/ui/CLAUDE.md)
    - [`frontend/src/hooks/`](frontend/src/hooks/CLAUDE.md)
    - [`frontend/src/lib/`](frontend/src/lib/CLAUDE.md)
    - [`frontend/src/pages/`](frontend/src/pages/CLAUDE.md)
      - [`frontend/src/pages/admin/`](frontend/src/pages/admin/CLAUDE.md)
        - [`frontend/src/pages/admin/audit-logs/`](frontend/src/pages/admin/audit-logs/CLAUDE.md)
        - [`frontend/src/pages/admin/coil-config/`](frontend/src/pages/admin/coil-config/CLAUDE.md)
        - [`frontend/src/pages/admin/customer-codes/`](frontend/src/pages/admin/customer-codes/CLAUDE.md)
        - [`frontend/src/pages/admin/regions/`](frontend/src/pages/admin/regions/CLAUDE.md)
        - [`frontend/src/pages/admin/settings/`](frontend/src/pages/admin/settings/CLAUDE.md)
        - [`frontend/src/pages/admin/users/`](frontend/src/pages/admin/users/CLAUDE.md)
      - [`frontend/src/pages/auth/`](frontend/src/pages/auth/CLAUDE.md)
        - [`frontend/src/pages/auth/login/`](frontend/src/pages/auth/login/CLAUDE.md)
      - [`frontend/src/pages/credit-report/`](frontend/src/pages/credit-report/CLAUDE.md)
      - [`frontend/src/pages/dashboard/`](frontend/src/pages/dashboard/CLAUDE.md)
        - [`frontend/src/pages/dashboard/home/`](frontend/src/pages/dashboard/home/CLAUDE.md)
      - [`frontend/src/pages/jsw-stock/`](frontend/src/pages/jsw-stock/CLAUDE.md)
      - [`frontend/src/pages/jvml-stock/`](frontend/src/pages/jvml-stock/CLAUDE.md)
      - [`frontend/src/pages/report/`](frontend/src/pages/report/CLAUDE.md)
    - [`frontend/src/routes/`](frontend/src/routes/CLAUDE.md)
    - [`frontend/src/store/`](frontend/src/store/CLAUDE.md)
      - [`frontend/src/store/auth/`](frontend/src/store/auth/CLAUDE.md)
    - [`frontend/src/styles/`](frontend/src/styles/CLAUDE.md)
    - [`frontend/src/types/`](frontend/src/types/CLAUDE.md)
      - [`frontend/src/types/admin/`](frontend/src/types/admin/CLAUDE.md)
      - [`frontend/src/types/analytics/`](frontend/src/types/analytics/CLAUDE.md)
      - [`frontend/src/types/api/`](frontend/src/types/api/CLAUDE.md)
      - [`frontend/src/types/auth/`](frontend/src/types/auth/CLAUDE.md)
      - [`frontend/src/types/credit-report/`](frontend/src/types/credit-report/CLAUDE.md)
      - [`frontend/src/types/dashboard/`](frontend/src/types/dashboard/CLAUDE.md)
      - [`frontend/src/types/jsw-stock/`](frontend/src/types/jsw-stock/CLAUDE.md)
      - [`frontend/src/types/jvml-stock/`](frontend/src/types/jvml-stock/CLAUDE.md)
      - [`frontend/src/types/meta/`](frontend/src/types/meta/CLAUDE.md)
      - [`frontend/src/types/report/`](frontend/src/types/report/CLAUDE.md)
      - [`frontend/src/types/settings/`](frontend/src/types/settings/CLAUDE.md)
      - [`frontend/src/types/theme/`](frontend/src/types/theme/CLAUDE.md)
      - [`frontend/src/types/user/`](frontend/src/types/user/CLAUDE.md)
- [`frontend_docs/`](frontend_docs/CLAUDE.md)
- [`macro_docs/`](macro_docs/CLAUDE.md)
- [`macro_files/`](macro_files/CLAUDE.md)
  - [`macro_files/25-06-2026/`](macro_files/25-06-2026/CLAUDE.md)
    - [`macro_files/25-06-2026/CREDITREPORT/`](macro_files/25-06-2026/CREDITREPORT/CLAUDE.md)
      - [`macro_files/25-06-2026/CREDITREPORT/WEST CENTRAL/`](macro_files/25-06-2026/CREDITREPORT/WEST CENTRAL/CLAUDE.md)
  - [`macro_files/26-06-2026/`](macro_files/26-06-2026/CLAUDE.md)
<!-- dox:index:end -->
