"""Resolve a configured report file *stem* to a real path, extension-agnostic.

The pollers store only a file stem (no extension). SAP exports arrive as
``.xlsx`` / ``.xlsm`` / ``.xlsb`` and a Linux filesystem is case-sensitive, so a
hard-coded ``".xlsx"`` silently misses every other format.

The stem is matched **leniently**: clients re-download the same export every day,
so it lands as ``NAME(1)`` / ``NAME 2`` / ``NAME (3)`` — the configured stem plus
a browser/OS duplicate suffix. We accept those (anchored to a numeric suffix, so
unrelated files like ``NAME SUMMARY`` are NOT matched) and return the **newest**
copy. All three ingestion domains share this one resolver.

Content detection (xlsx vs xlsb) happens later in ``shared.excel.parse_workbook``;
this module only finds the file.
"""
from __future__ import annotations

import os
import re

# Accepted Excel extensions, in resolution-priority order (mtime-tie tie-break).
EXCEL_EXTS: tuple[str, ...] = (".xlsx", ".xlsm", ".xlsb")


def _matches_stem(stem: str, file_name: str) -> bool:
    """True when *stem* is *file_name* or *file_name* + a re-download suffix.

    Case-insensitive. Accepts ``<name>``, ``<name>(n)``, ``<name> (n)`` and
    ``<name> n`` (space + digits). A bare trailing number needs a leading space,
    so ``"report 2"`` matches but the unrelated ``"report2024"`` does not.
    """
    name = file_name.strip().lower()
    if not name:
        return False
    pattern = rf"{re.escape(name)}(?:\s*\(\d+\)|\s+\d+)?"
    return re.fullmatch(pattern, stem.strip().lower()) is not None


def resolve_report_file(folder: str, file_name: str) -> str | None:
    """Return the newest Excel file in *folder* matching *file_name*, or ``None``.

    A directory entry matches when its extension is a known Excel extension
    (case-insensitive) and its stem satisfies :func:`_matches_stem`. When several
    files match, the most recently modified wins; ties break by :data:`EXCEL_EXTS`
    priority (xlsx > xlsm > xlsb) then path. Returns ``None`` when the folder is
    unreadable or holds no matching file.
    """
    try:
        entries = os.listdir(folder)
    except OSError:
        return None

    best: tuple[float, int, str] | None = None
    for entry in entries:
        stem, ext = os.path.splitext(entry)
        ext_l = ext.lower()
        if ext_l not in EXCEL_EXTS or not _matches_stem(stem, file_name):
            continue
        path = os.path.join(folder, entry)
        try:
            mtime = os.path.getmtime(path)
        except OSError:
            continue  # vanished mid-scan
        # Higher tuple wins: newest mtime, then xlsx>xlsm>xlsb, then path.
        candidate = (mtime, -EXCEL_EXTS.index(ext_l), path)
        if best is None or candidate > best:
            best = candidate

    return best[2] if best else None
