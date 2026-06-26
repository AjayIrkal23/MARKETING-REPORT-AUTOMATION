# Ingestion file resolution: exact → anchored "includes" match — Implementation Plan

> Archive copy. Primary: repo-root `plan-2026-06-26-ingestion-contains-filename-match.md`.
> Spec: `docs/superpowers/specs/2026-06-26-ingestion-contains-filename-match-design.md`.

**Goal:** Make `resolve_report_file` find re-downloaded daily exports
(`NAME(1)`, `NAME 2`, `NAME (3)`), newest wins — fixing JSW + JVML + credit
ingestion at once via the one shared resolver.

**Single change site:** `backend/app/utils/shared/resolve.py::resolve_report_file`
(+ its test + the dir doc). No poller/schema/parser/cleanup edits.

## Global Constraints

- Match (case-insensitive, stripped, lowercased stem):
  `^{re.escape(name)}(?:\s*\(\d+\)|\s+\d+)?$` — exact OR `name`+`(n)`/`␠(n)`/`␠n`.
  Bare trailing number needs a leading space.
- Extensions unchanged (`.xlsx/.xlsm/.xlsb`, case-insensitive).
- Tie-break: newest `mtime` → `EXCEL_EXTS` priority → path.

## Task 1 — Rewrite resolver (TDD)
1. Rewrite `tests/test_shared_resolve.py` for the new contract (exact, suffix set,
   superstring negatives, newest-wins, equal-mtime ext-priority, unknown/missing).
2. Run → fail. 3. Implement `_matches_stem` + max-tuple scan. 4. Run → green.
5. Full suite green.

## Task 2 — Docs
Update `backend/app/utils/shared/CLAUDE.md` resolver line; mark spec done.
