# Marketing Report Automation

## What This Is

A JSW Steel marketing tooling system that ingests three SAP Excel exports (credit management, customer master, and current hot-rolled stock) and exposes them as a queryable API with a branded React dashboard. The backend is a FastAPI service currently scaffolded as a ping-pong API; the frontend is a JSW-themed Vite/React dashboard shell with mock authentication. The project goal is to replace manual Excel analysis with automated, server-driven report generation.

## Core Value

Turn raw SAP exports — credit exposure, customer accounts, and live coil inventory — into trustworthy, queryable marketing answers without ever writing back to SAP.

---

## Requirements

### Validated
_(Already exists in the codebase)_

- **FastAPI ping-pong API scaffold** — `GET /`, `GET /health`, `GET /ping`, `WS /ws/ping`; Pydantic models; CORS configured for Vite dev/preview ports (5173, 4173). See `backend/app/main.py`.
- **JSW-themed dashboard shell** — Vite 8 + React 19 + TypeScript, Tailwind CSS v4 (shadcn/ui oklch tokens; JSW-specific brand tokens not yet defined), Redux Toolkit auth slice, react-router-dom protected routes, LoginPage and HomePage, shadcn/ui component library (~55 components).
- **Mock authentication** — accepts any non-empty credentials, persists session to `localStorage`; `ProtectedRoute` guards `/home`.
- **Complete data dictionary** — `macro_docs/` contains per-file markdown docs (`credit-report.md`, `west-central-customer-codes.md`, `zsd-currstk-hr.md`) plus a `README.md` routing table. Written specifically for AI agents.

### Active
_(Intended next work)_

- **Excel ingestion layer** — tolerant readers for all three SAP files that survive the ZSD invalid-XML issue (raw-parse or re-save workaround), normalize numeric TEXT columns, strip Excel `#VALUE!` errors, and expose clean Python models.
- **Report/query API** — endpoints over credit exposure (`credit report.XLSX`), customer accounts (`west  central customer codes.xlsx`), and current stock (`ZSD_CURRSTK_HR.xlsx`), joined on SAP customer code; response envelope `{success, data, message, meta}`.
- **Dashboard reports and visualizations** — recharts-based charts replacing the placeholder home card; server-driven filtering/sorting/pagination; no client-side filtering of server data.
- **Replace mock auth with real authentication** — JWT or session-based; remove the `localStorage` credential bypass.

### Out of Scope

| Item | Why |
|------|-----|
| Write-back to SAP | The source files are read-only exports; no SAP RFC/BAPI integration is in scope. |
| Non-HR product lines | The stock file (`ZSD_CURRSTK_HR`) covers Hot-Rolled only; Cold-Rolled, Galvanised, etc. require separate SAP extracts that are not available. |
| Real-time SAP sync | Files are batch exports; live OData/RFC connectivity is a separate initiative. |

---

## Context

### Source Data Files (`macro_files/`)

| File | Description | Shape | Primary Use |
|------|-------------|-------|-------------|
| `credit report.XLSX` | SAP Credit Management export | 195 rows × 33 cols | Credit limit, exposure, overdue, block status |
| `west  central customer codes.xlsx` | Customer master / account mapping (note: two spaces in filename) | 77 rows × 12 cols | CAM, mobile contact, segment, route/destination |
| `ZSD_CURRSTK_HR.xlsx` | SAP ZSD_CURRSTK current-stock, Hot-Rolled | 17,324 rows × 72 cols | Physical coil/batch inventory, chemistry, mechanical properties, aging, NCO/rework, export logistics |

**Units:** Amounts in INR; quantities in Metric Tonnes (MT).

**Join key:** SAP customer code (e.g. `40000088`) links all three files. In ZSD, `Party Code` is zero-padded to 10 digits — strip leading zeros to match `Customer`. Short codes 8451–8499 / 8001-style = internal JSW stock-transfer yards, not external customers.

### Data Gotchas

- `ZSD_CURRSTK_HR.xlsx` contains **invalid XML**: one numeric cell holds `"1.057.000"`, causing `openpyxl.load_workbook()` to raise `ValueError: could not convert string to float` in both read-only and normal mode. **Fix:** re-save in Excel/LibreOffice, or raw-parse the ZIP (`xl/sharedStrings.xml` + `xl/worksheets/sheet1.xml`) keeping non-floatable numeric cells as strings.
- Many ZSD numeric columns are stored as **TEXT** (`Act.Thickness (mm)`, `Width (mm)`, `Length(mm)`, `HARDNESS`, `YIELD STRENGTH`, `UTS`; `LC Exp Date` is text `dd.mm.yyyy`). Cast before arithmetic.
- `credit report.XLSX` has **`#VALUE!` Excel errors** (e.g. `Validity Period End`) and ~22 trailing blank/footer rows.
- **Casing not normalised** (`oem` vs `OEM`; `Mumbai` vs `mumbai`). Headers can have **trailing spaces** (e.g. `"CAM "`). Last 1–2 columns of the customer-codes file are unnamed junk.
- `pandas` and `openpyxl` are **not installed** in the system Python by default. Install with: `pip3 install --break-system-packages openpyxl` (add `pandas` if needed).

---

## Constraints

| Constraint | Detail |
|------------|--------|
| Backend stack | Python 3.13.7, FastAPI 0.136.3, Pydantic 2.13.4, Uvicorn 0.48.0; `requirements.txt` is fully pinned |
| Frontend stack | Vite 8, React 19.2, TypeScript ~6.0, Tailwind CSS v4, Redux Toolkit 2, react-router-dom 7, recharts 3, shadcn/ui |
| openpyxl not pre-installed | Must install before any Excel parsing; see gotchas above |
| ZSD invalid XML | `openpyxl.load_workbook()` fails on the raw file; raw-ZIP parsing required unless file is re-saved |
| Customer-code join | Strip leading zeros from ZSD `Party Code` before joining; exclude internal yard codes |
| CORS origins | Backend allows only `localhost:5173`, `127.0.0.1:5173`, `localhost:4173` |
| Read-only data | No writes to SAP or the Excel files |

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| API framework | FastAPI + Pydantic v2 | Type-safe, async-ready, auto-docs; team familiar with Python |
| Frontend framework | Vite + React 19 + TypeScript | Fast DX, strong ecosystem, matches JSW design system needs |
| State management | Redux Toolkit | Predictable; auth slice already seeded; scales to complex report state |
| UI components | shadcn/ui (Radix + Tailwind) | Accessible primitives; fits Tailwind v4 design tokens already defined |
| Charting | recharts 3 | Already installed; composable React components |
| Data source | Read-only over SAP batch exports | No SAP connectivity required; files refreshed manually |
| Auth (current) | Mock auth → real auth planned | Ships dashboard shell now; proper auth in Phase 5 |

---

_Last updated: 2026-05-29 after initial scaffold_
