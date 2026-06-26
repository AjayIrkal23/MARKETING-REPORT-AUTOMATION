# Ingestion file resolution: exact → anchored "includes" match — Implementation Plan

> **For agentic workers:** single-file logic change + its unit test + a doc line.
> Spec: `docs/superpowers/specs/2026-06-26-ingestion-contains-filename-match-design.md`.

**Goal:** Make `resolve_report_file` find re-downloaded daily exports
(`NAME(1)`, `NAME 2`, `NAME (3)`), newest wins — fixing JSW + JVML + credit
ingestion at once via the one shared resolver.

**Architecture:** All three pollers already call the single
`backend/app/utils/shared/resolve.py::resolve_report_file`. Only that function +
its test + the dir doc change. No poller/schema/parser/cleanup edits.

**Tech Stack:** Python 3.13 stdlib (`os`, `re`), pytest.

## Global Constraints (from spec)

- Match: case-insensitive; `stem == name` OR `name` + suffix `(n)` / `␠(n)` / `␠n`.
  Regex: `^{re.escape(name)}(?:\s*\(\d+\)|\s+\d+)?$` on stripped, lowercased stems.
- A bare trailing number requires a leading space (`report 2` ✓, `report2024` ✗).
- Extension set unchanged: `.xlsx/.xlsm/.xlsb`, case-insensitive ext.
- Multi-match tie-break: newest `mtime` → `EXCEL_EXTS` priority → path.
- File ≤ 250 lines; no new dependencies.

---

### Task 1: Rewrite the resolver (TDD)

**Files:**
- Modify: `backend/app/utils/shared/resolve.py` (rewrite `resolve_report_file`, add `_matches_stem`, `import re`)
- Test: `backend/tests/test_shared_resolve.py` (rewrite)

**Interfaces:**
- Produces: `resolve_report_file(folder: str, file_name: str) -> str | None` (signature unchanged); new private `_matches_stem(stem: str, file_name: str) -> bool`.
- Consumes: nothing new — same call sites.

- [ ] **Step 1 — Rewrite the test** to pin the new contract: exact still matches; `REPORT(1)`/`REPORT (3)`/`REPORT 2`/`report(7)` resolve; `REPORT SUMMARY`/`MONTHLY REPORT`/`REPORT2024`/`REPORTX` do NOT; newest-mtime wins across two matches; equal-mtime same-stem different-ext → xlsx; unknown ext / missing / unreadable → None. Use `os.utime` for deterministic mtimes.

- [ ] **Step 2 — Run, expect failures** for the new suffix/newest cases:
  `cd backend && ./.venv/bin/python -m pytest tests/test_shared_resolve.py -q`

- [ ] **Step 3 — Implement** `_matches_stem` (anchored regex) + rewrite the scan loop to collect matches and keep `max (mtime, -ext_index, path)`; skip entries whose `getmtime` raises.

- [ ] **Step 4 — Run, expect green:**
  `cd backend && ./.venv/bin/python -m pytest tests/test_shared_resolve.py -q`

- [ ] **Step 5 — Full suite** (no regression in pollers/exports):
  `cd backend && ./.venv/bin/python -m pytest -q`

### Task 2: Docs

**Files:** Modify `backend/app/utils/shared/CLAUDE.md` (resolver line), update spec status, optional memory note.

- [ ] Update the `resolve.py` row to describe the suffix-aware, newest-wins behavior.

## Self-review

- Spec coverage: anchored rule ✓, newest-wins ✓, 3 domains via 1 site ✓, tests ✓.
- No placeholders. Types: `_matches_stem -> bool`, resolver signature unchanged.
- Risk: regex over/under-match — covered by the superstring negative tests.
