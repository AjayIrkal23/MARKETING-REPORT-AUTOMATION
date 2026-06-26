"""Tests for the stale date-folder purge (utils/shared/cleanup.py).

Pure-function, no DB: drives ``purge_old_date_folders`` against a tmp tree.
"""

from __future__ import annotations

import os
from datetime import date
from typing import Any

from app.utils.shared.cleanup import purge_old_date_folders

TODAY = date(2026, 6, 26)


def _mk(base: Any, name: str) -> str:
    d = base / name
    d.mkdir()
    (d / "report.xlsx").write_bytes(b"x")  # a file inside, to prove rmtree recurses
    return str(d)


def test_deletes_only_folders_older_than_retention(tmp_path: Any) -> None:
    keep_today = _mk(tmp_path, "26-06-2026")   # age 0
    keep_edge = _mk(tmp_path, "21-06-2026")    # age 5 == retention → kept
    del_old = _mk(tmp_path, "20-06-2026")      # age 6 > retention → deleted
    del_older = _mk(tmp_path, "01-01-2026")    # ancient → deleted

    deleted = purge_old_date_folders(str(tmp_path), today=TODAY, retention_days=5)

    assert set(deleted) == {del_old, del_older}
    assert os.path.isdir(keep_today)
    assert os.path.isdir(keep_edge)
    assert not os.path.exists(del_old)
    assert not os.path.exists(del_older)


def test_skips_non_date_dirs_and_loose_files(tmp_path: Any) -> None:
    not_a_date = _mk(tmp_path, "CREDITREPORT")
    junk = _mk(tmp_path, "notadate")
    loose = tmp_path / "summary.xlsx"
    loose.write_bytes(b"x")

    deleted = purge_old_date_folders(str(tmp_path), today=TODAY, retention_days=5)

    assert deleted == []
    assert os.path.isdir(not_a_date)
    assert os.path.isdir(junk)
    assert loose.exists()


def test_missing_base_path_is_a_noop() -> None:
    assert purge_old_date_folders("/nonexistent/xyz", today=TODAY, retention_days=5) == []
    assert purge_old_date_folders("", today=TODAY, retention_days=5) == []


def test_retention_zero_deletes_everything_but_today(tmp_path: Any) -> None:
    keep_today = _mk(tmp_path, "26-06-2026")   # age 0 == retention 0 → kept
    del_yest = _mk(tmp_path, "25-06-2026")     # age 1 > 0 → deleted

    deleted = purge_old_date_folders(str(tmp_path), today=TODAY, retention_days=0)

    assert deleted == [del_yest]
    assert os.path.isdir(keep_today)
