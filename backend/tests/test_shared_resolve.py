"""Tests for the shared report-file resolver (extension-agnostic, suffix-aware).

The resolver matches the configured stem plus browser/OS re-download suffixes
(``NAME(1)`` / ``NAME 2`` / ``NAME (3)``) and returns the newest matching file.
"""

from __future__ import annotations

import os
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


def test_exact_stem_still_matches(tmp_path: Any) -> None:
    p = tmp_path / "credit report.XLSX"
    p.write_bytes(b"x")
    assert resolve_report_file(str(tmp_path), "credit report") == str(p)


@pytest.mark.parametrize(
    "fname",
    ["REPORT(1).xlsx", "REPORT (3).xlsx", "REPORT 2.xlsx", "report(7).xlsx"],
)
def test_redownload_suffix_matches(tmp_path: Any, fname: str) -> None:
    """A re-downloaded copy resolves to the same report (case-insensitive)."""
    p = tmp_path / fname
    p.write_bytes(b"x")
    assert resolve_report_file(str(tmp_path), "REPORT") == str(p)


@pytest.mark.parametrize(
    "fname",
    ["REPORT SUMMARY.xlsx", "MONTHLY REPORT.xlsx", "REPORT2024.xlsx", "REPORTX.xlsx"],
)
def test_superstring_not_matched(tmp_path: Any, fname: str) -> None:
    """Anchored rule rejects unrelated files whose name merely contains the stem."""
    (tmp_path / fname).write_bytes(b"x")
    assert resolve_report_file(str(tmp_path), "REPORT") is None


def test_newest_match_wins(tmp_path: Any) -> None:
    old = tmp_path / "REPORT.xlsx"
    new = tmp_path / "REPORT(3).xlsx"
    old.write_bytes(b"x")
    new.write_bytes(b"x")
    os.utime(old, (1000, 1000))
    os.utime(new, (2000, 2000))
    assert resolve_report_file(str(tmp_path), "REPORT") == str(new)


def test_extension_priority_breaks_mtime_tie(tmp_path: Any) -> None:
    for ext in (".xlsb", ".xlsm", ".xlsx"):
        p = tmp_path / f"R{ext}"
        p.write_bytes(b"x")
        os.utime(p, (1000, 1000))  # identical mtimes → ext priority decides
    result = resolve_report_file(str(tmp_path), "R")
    assert result is not None and result.endswith(".xlsx")


def test_picks_xlsb_when_only_xlsb_present(tmp_path: Any) -> None:
    p = tmp_path / "R.xlsb"
    p.write_bytes(b"x")
    assert resolve_report_file(str(tmp_path), "R") == str(p)


def test_missing_file_returns_none(tmp_path: Any) -> None:
    assert resolve_report_file(str(tmp_path), "NOPE") is None


def test_unreadable_folder_returns_none() -> None:
    assert resolve_report_file("/nonexistent/folder/xyz", "R") is None
