"""Tests for the shared, format-agnostic Excel parser (app.utils.shared.excel).

Covers: OOXML (.xlsx) real parsing incl. malformed-numeric + blank-row skip;
content-based dispatch (xlsx/xlsm by content, .xlsb routing, .xls rejection); and
the .xlsb mapping logic with pyxlsb stubbed.

A real .xlsb fixture cannot be produced in this environment — LibreOffice can read
.xlsb but has no export filter, and no maintained Python lib writes .xlsb. So the
real-fixture parity test is skipif-gated: drop a real SAP .xlsb at
tests/fixtures/sample.xlsb (headers "Party Code"/"Qty") to enable it. The pyxlsb
decoder itself is third-party and exercised end-to-end in the manual e2e step.
"""

from __future__ import annotations

import io
import os
import sys
import types
import zipfile

import openpyxl
import pytest

from app.utils.shared import excel as shared_excel
from app.utils.shared.excel import parse_workbook

H2F = {"party code": "party_code", "qty": "qty"}


def _norm(h: object) -> str:
    return " ".join(str(h).split()).strip().lower()


def _xlsx_bytes() -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["Party Code", "Qty"])
    ws.append(["0008451", "1.057.000"])   # malformed-numeric text — kept verbatim
    ws.append(["8001", 42])
    ws.append([None, None])               # fully-blank row — must be skipped
    bio = io.BytesIO()
    wb.save(bio)
    return bio.getvalue()


# --- OOXML real parsing -----------------------------------------------------


def test_xlsx_parses_maps_columns_keeps_malformed_skips_blank() -> None:
    rows = parse_workbook(_xlsx_bytes(), H2F, _norm)
    assert rows == [
        {"party_code": "0008451", "qty": "1.057.000"},
        {"party_code": "8001", "qty": 42.0},
    ]


def test_unmapped_columns_are_dropped() -> None:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["Party Code", "Junk", "Qty"])
    ws.append(["8001", "ignore-me", 7])
    bio = io.BytesIO()
    wb.save(bio)
    rows = parse_workbook(bio.getvalue(), H2F, _norm)
    assert rows == [{"party_code": "8001", "qty": 7.0}]


# --- dispatch / rejection ---------------------------------------------------


def test_empty_bytes_returns_empty() -> None:
    assert parse_workbook(b"", H2F, _norm) == []


def test_legacy_xls_ole2_rejected() -> None:
    # OLE2 compound-file magic — a real .xls. Not supported.
    with pytest.raises(ValueError):
        parse_workbook(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1rest", H2F, _norm)


def test_non_excel_zip_rejected() -> None:
    bio = io.BytesIO()
    with zipfile.ZipFile(bio, "w") as zf:
        zf.writestr("hello.txt", "hi")
    with pytest.raises(ValueError):
        parse_workbook(bio.getvalue(), H2F, _norm)


def test_xlsb_content_routes_to_xlsb_parser(monkeypatch: pytest.MonkeyPatch) -> None:
    """A zip carrying xl/worksheets/sheet1.bin must dispatch to the .xlsb path,
    regardless of the (here, absent) file extension — this is the fix for
    'xlsb reported as missing/unrecognized'."""
    bio = io.BytesIO()
    with zipfile.ZipFile(bio, "w") as zf:
        zf.writestr("xl/worksheets/sheet1.bin", b"\x00\x01")
    called = {}

    def _fake_xlsb(data: bytes, h2f: dict, norm) -> list:
        called["hit"] = True
        return [{"party_code": "ROUTED"}]

    monkeypatch.setattr(shared_excel, "_parse_xlsb", _fake_xlsb)
    rows = parse_workbook(bio.getvalue(), H2F, _norm)
    assert called.get("hit") is True
    assert rows == [{"party_code": "ROUTED"}]


# --- .xlsb mapping logic (pyxlsb stubbed, no real .xlsb needed) --------------


class _Cell:
    def __init__(self, c: int, v: object) -> None:
        self.c = c
        self.v = v


class _Sheet:
    def __init__(self, rows: list) -> None:
        self._rows = rows

    def __enter__(self) -> "_Sheet":
        return self

    def __exit__(self, *_a: object) -> bool:
        return False

    def rows(self):
        return iter(self._rows)


class _WB:
    def __init__(self, rows: list) -> None:
        self._rows = rows

    def __enter__(self) -> "_WB":
        return self

    def __exit__(self, *_a: object) -> bool:
        return False

    def get_sheet(self, _i: int) -> _Sheet:
        return _Sheet(self._rows)


def test_parse_xlsb_maps_headers_and_skips_blank(monkeypatch: pytest.MonkeyPatch) -> None:
    rows = [
        [_Cell(0, "Party Code"), _Cell(1, "Qty")],
        [_Cell(0, "0008451"), _Cell(1, 100.0)],
        [_Cell(0, "8001"), _Cell(1, 42.0)],
        [_Cell(0, None), _Cell(1, None)],   # blank — skipped
    ]
    fake = types.ModuleType("pyxlsb")
    fake.open_workbook = lambda _io: _WB(rows)  # type: ignore[attr-defined]
    monkeypatch.setitem(sys.modules, "pyxlsb", fake)

    out = shared_excel._parse_xlsb(b"x", H2F, _norm)
    assert out == [
        {"party_code": "0008451", "qty": 100.0},
        {"party_code": "8001", "qty": 42.0},
    ]


# --- real fixture (only if provided) ----------------------------------------


@pytest.mark.skipif(
    not os.path.exists("tests/fixtures/sample.xlsb"),
    reason="no real .xlsb fixture (LibreOffice cannot write .xlsb); drop a real "
    "SAP .xlsb with headers 'Party Code'/'Qty' at tests/fixtures/sample.xlsb",
)
def test_real_xlsb_fixture_parses() -> None:
    data = open("tests/fixtures/sample.xlsb", "rb").read()
    rows = parse_workbook(data, H2F, _norm)
    assert [r["party_code"] for r in rows] == ["0008451", "8001"]
