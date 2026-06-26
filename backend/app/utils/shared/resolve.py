"""Resolve a configured report file *stem* to a real path, extension-agnostic.

The pollers store only a file stem (no extension). SAP exports arrive as
``.xlsx`` / ``.xlsm`` / ``.xlsb`` and a Linux filesystem is case-sensitive, so a
hard-coded ``".xlsx"`` silently misses every other format — which surfaced as
reports being reported "missing". Match the stem against any known Excel
extension (case-insensitively), preferring xlsx > xlsm > xlsb when several exist.

Content detection (xlsx vs xlsb) happens later in ``shared.excel.parse_workbook``;
this module only finds the file.
"""
from __future__ import annotations

import os

# Accepted Excel extensions, in resolution-priority order.
EXCEL_EXTS: tuple[str, ...] = (".xlsx", ".xlsm", ".xlsb")


def resolve_report_file(folder: str, file_name: str) -> str | None:
    """Return the path to ``<file_name>.<excel-ext>`` inside *folder*, or ``None``.

    Single directory scan: stem matched exactly, extension compared lower-cased
    against :data:`EXCEL_EXTS`. When several extensions share the stem,
    :data:`EXCEL_EXTS` order decides which wins. Returns ``None`` when the folder
    is unreadable or holds no matching file.
    """
    try:
        entries = os.listdir(folder)
    except OSError:
        return None

    matches: dict[str, str] = {}
    for entry in entries:
        stem, ext = os.path.splitext(entry)
        ext_l = ext.lower()
        if stem == file_name and ext_l in EXCEL_EXTS and ext_l not in matches:
            matches[ext_l] = os.path.join(folder, entry)

    for ext in EXCEL_EXTS:
        if ext in matches:
            return matches[ext]
    return None
