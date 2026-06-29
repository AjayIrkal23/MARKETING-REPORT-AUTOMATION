"""``run_poll`` re-ingests even when today is already ``"ingested"`` + stamps ``last_run_at``.

DB-free: the config singleton, the ingestion record, the file resolver and
``ingest_file`` are all monkeypatched on the poller module, so no MongoDB / Excel
is touched (mirrors the patch style of ``test_report_export_route.py`` and the
``asyncio.run`` convention of ``test_credit_report_zone_ingestion.py``).

Proves two things from the hourly-idempotent-ingestion change:
- Phase 1 (skip-guard removed): on an already-``"ingested"`` date the poll still
  runs ``ingest_file`` — before the fix it short-circuited and never did.
- Phase 2 (per-tick stamp): ``last_run_at`` is set on every executed poll.

JSW is the representative case; the JVML poller is byte-for-byte equivalent.
"""

from __future__ import annotations

import asyncio
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock

from app.services.jsw_stock import poller


def test_rerun_ingests_when_already_ingested(tmp_path: Any, monkeypatch: Any) -> None:
    cfg = SimpleNamespace(
        enabled=True,
        base_path=str(tmp_path),
        file_name="ZSD_CURRSTK_HR.xlsx",
        start_time="00:00",  # window always open
        end_time="23:59",
    )
    rec = SimpleNamespace(
        report_date="01-01-2026",
        status="ingested",  # already done earlier today
        row_count=5,
        found_at=None,
        alerted_at=None,
        file_path=None,
        updated_at=None,
        last_run_at=None,
        error=None,
        save=AsyncMock(),
    )
    monkeypatch.setattr(poller.JswStockConfig, "find_one", AsyncMock(return_value=cfg))
    monkeypatch.setattr(poller.JswStockIngestion, "find_one", AsyncMock(return_value=rec))
    ingest = AsyncMock(return_value=7)
    monkeypatch.setattr(poller, "ingest_file", ingest)
    monkeypatch.setattr(
        poller, "resolve_report_file", lambda folder, name: str(tmp_path / name)
    )
    monkeypatch.setattr(poller, "get_status", AsyncMock(return_value="STATUS"))

    out = asyncio.run(poller.run_poll())

    ingest.assert_awaited_once()  # FAILS before guard removal — proves the fix
    assert rec.status == "ingested"
    assert rec.row_count == 7
    assert rec.last_run_at is not None  # per-tick stamp
    assert out == "STATUS"
