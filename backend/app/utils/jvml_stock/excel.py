"""JVML Stock workbook parser — thin wrapper over the shared parser.

Container detection (.xlsx/.xlsm/.xlsb) and row extraction live in
``app.utils.shared.excel``; this module only binds the JVML column map so the
shared parser can label columns. Callers apply ``coerce_value`` from
``columns.py`` to the raw values afterward.
"""
from __future__ import annotations

from typing import Any

from ..shared.excel import parse_workbook as _parse_workbook
from .columns import HEADER_TO_FIELD, normalize_header


def parse_workbook(data: bytes) -> list[dict[str, Any]]:
    """Parse JVML Stock workbook bytes into raw ``[{field: value}]`` dicts."""
    return _parse_workbook(data, HEADER_TO_FIELD, normalize_header)
