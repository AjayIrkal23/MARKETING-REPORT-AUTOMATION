# Spec: Ingestion file resolution — exact → anchored "includes" match

## Objective

Client PCs re-download the same SAP export every day, so files arrive named
`NAME(1).xlsx`, `NAME 2.XLSX`, `NAME (3).xlsm`, … instead of the configured
stem `NAME`. Today ingestion only finds an **exact** stem match, so every
re-downloaded copy is reported "missing".

Change the **single shared resolver** so it also matches the configured stem
plus a browser/OS duplicate suffix, picking the **newest** copy. This fixes all
three ingestion domains (JSW stock, JVML stock, credit report — flat + region
zone) at once, because they all call the one resolver.

**Success =** with config `file_name = "credit report"`, a folder containing
only `credit report(3).xlsx` ingests successfully (was: "missing"), and when
`credit report.xlsx` + `credit report(1).xlsx` both exist, the newest is used.

## Tech Stack

Python 3.13, FastAPI backend. No new dependencies (`os` + `re` stdlib only).

## Commands

```bash
cd backend
./.venv/bin/python -m pytest tests/test_shared_resolve.py -q   # resolver unit tests
./.venv/bin/python -m pytest -q                                 # full suite
```

## The single change site

`backend/app/utils/shared/resolve.py::resolve_report_file(folder, file_name)`
— line 37 today is `if stem == file_name and …`. Everything else (4 call sites
across the 3 pollers, config schemas, the content-detecting parser, the
folder-cleanup job) is **unchanged** — verified by the audit.

## Matching rule (the contract)

Both sides compared **case-insensitively** on the stripped file stem
(extension handling is unchanged: `.xlsx/.xlsm/.xlsb`, case-insensitive ext).

A directory entry's stem `s` matches configured `name` when:

```
s == name
OR  s == name + "(" + digits + ")"          # NAME(1), NAME(12)
OR  s == name + " " + optional "(" digits ")"  # "NAME 2", "NAME (3)"
```

Regex (applied with `re.fullmatch`, both sides `.strip().lower()`):

```
^{re.escape(name)}(?:\s*\(\d+\)|\s+\d+)?$
```

| stem (config `name = "credit report"`) | matches? | why |
|---|---|---|
| `credit report` | ✓ | exact |
| `credit report(1)` | ✓ | `(n)` suffix |
| `credit report (3)` | ✓ | space + `(n)` |
| `credit report 2` | ✓ | space + bare number |
| `CREDIT REPORT(1)` | ✓ | case-insensitive |
| `credit report summary` | ✗ | non-numeric tail |
| `monthly credit report` | ✗ | not a prefix |
| `credit report2024` | ✗ | bare number needs a leading space (avoids superstring collisions) |

## Tie-break (multiple matches in the same day's folder)

Collect every match, then pick by tuple ordering, highest wins:

```
(mtime, ext_priority, path)
```

1. **Newest `os.path.getmtime`** — the latest re-download is the fresh data.
2. **Extension priority** `xlsx > xlsm > xlsb` — only when mtimes tie.
3. **Path string** — final deterministic tie-break.

A match whose `getmtime` raises (deleted mid-scan) is skipped.

## Project structure (touched)

```
backend/app/utils/shared/resolve.py        → rewrite resolve_report_file (+ helper)
backend/tests/test_shared_resolve.py       → update exact-match test, add suffix + newest-wins tests
backend/app/utils/shared/CLAUDE.md         → doc the new semantics (if it names the resolver)
```

## Code style (target resolver)

```python
def _matches_stem(stem: str, file_name: str) -> bool:
    """True when *stem* is *file_name* or *file_name* + a re-download suffix.

    Case-insensitive; accepts "<name>", "<name>(n)", "<name> (n)", "<name> n".
    A bare trailing number needs a space so "report 2" matches but the unrelated
    "report2024" does not.
    """
    name = file_name.strip().lower()
    if not name:
        return False
    return re.fullmatch(rf"{re.escape(name)}(?:\s*\(\d+\)|\s+\d+)?", stem.strip().lower()) is not None
```

## Testing strategy

pytest, file-system temp dirs (`tmp_path`). Keep the existing passing cases
(extension priority via **equal mtimes**, case-insensitive ext, unknown ext,
missing/unreadable folder). Replace the exact-only assertion; add:
- `NAME(1)` / `NAME 2` / `NAME (3)` / lowercase variant resolve.
- `NAME summary` / `monthly NAME` / `NAME2024` do **not** resolve.
- two matches with different mtimes → newest returned.
- equal-mtime same-stem different-ext → xlsx wins.

## Boundaries

- **Always:** keep extension-agnostic + day-folder scoping; deterministic result.
- **Ask first:** none — decisions (anchored rule, newest-wins) are locked.
- **Never:** touch pollers/config schemas/parser/cleanup; loosen to a bare
  substring (`name in stem`) — that re-introduces the superstring-collision risk
  the anchored rule avoids.

## Success criteria

- [ ] `resolve_report_file` returns the newest matching file for the suffix set.
- [ ] Exact match still works; superstrings (`NAME summary`, `NAME2024`) excluded.
- [ ] All three domains benefit with no poller edits.
- [ ] `pytest tests/test_shared_resolve.py` green; full suite green.

## Open questions

None — proceed to plan + implementation.
