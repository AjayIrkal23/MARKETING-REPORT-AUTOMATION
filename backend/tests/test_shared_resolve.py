"""Tests for the shared extension-agnostic report-file resolver."""

from __future__ import annotations

from typing import Any

import pytest

from app.utils.shared.resolve import resolve_report_file


@pytest.mark.parametrize("ext", [".xlsx", ".XLSX", ".Xlsx", ".xlsm", ".xlsb", ".XLSB"])
def test_resolves_each_excel_ext_case_insensitively(tmp_path: Any, ext: str) -> None:
    p = tmp_path / f"REPORT{ext}"
    p.write_bytes(b"x")
    assert resolve_report_file(str(tmp_path), "REPORT") == str(p)


def test_unknown_extension_not_resolved(tmp_path: Any) -> None:
    (tmp_path / "REPORT.csv").write_bytes(b"x")
    (tmp_path / "REPORT.txt").write_bytes(b"x")
    assert resolve_report_file(str(tmp_path), "REPORT") is None


def test_priority_prefers_xlsx_then_xlsm_then_xlsb(tmp_path: Any) -> None:
    (tmp_path / "R.xlsb").write_bytes(b"x")
    (tmp_path / "R.xlsm").write_bytes(b"x")
    (tmp_path / "R.xlsx").write_bytes(b"x")
    assert resolve_report_file(str(tmp_path), "R").endswith(".xlsx")


def test_picks_xlsb_when_only_xlsb_present(tmp_path: Any) -> None:
    p = tmp_path / "R.xlsb"
    p.write_bytes(b"x")
    assert resolve_report_file(str(tmp_path), "R") == str(p)


def test_exact_stem_match_only(tmp_path: Any) -> None:
    (tmp_path / "REPORT_2026.xlsx").write_bytes(b"x")
    assert resolve_report_file(str(tmp_path), "REPORT") is None


def test_missing_file_returns_none(tmp_path: Any) -> None:
    assert resolve_report_file(str(tmp_path), "NOPE") is None


def test_unreadable_folder_returns_none() -> None:
    assert resolve_report_file("/nonexistent/folder/xyz", "R") is None
