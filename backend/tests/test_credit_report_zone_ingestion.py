"""Unit tests for credit-report region-zone ingestion behavior."""

from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Any

from app.models.credit_report_ingestion import CreditReportZoneRun
from app.services.credit_report import ingest
from app.services.credit_report.zone_polling import roll_up, safe_dir
from app.services.shared.ingest_cleanup import _row_hash


def test_safe_dir_removes_path_traversal() -> None:
    assert safe_dir("North/West..\\Zone") == "North_West_Zone"
    assert safe_dir(" .. ") == "region"


def test_roll_up_marks_partial_when_some_zones_ingested() -> None:
    class _Ingestion:
        report_date = "24-06-2026"
        row_count = 0
        found_at = None
        file_path = None
        error = None
        status = "pending"
        updated_at = None
        zones = [
            CreditReportZoneRun(
                region_id="north",
                name="North",
                status="ingested",
                row_count=10,
                found_at=datetime(2026, 6, 24, 9, 0),
            ),
            CreditReportZoneRun(region_id="south", name="South", status="missing"),
        ]

    ingestion = _Ingestion()

    roll_up(ingestion)

    assert ingestion.status == "partial"
    assert ingestion.row_count == 10
    assert ingestion.found_at == datetime(2026, 6, 24, 9, 0)


def test_row_hash_keeps_cross_zone_rows_distinct() -> None:
    row = {"customer": "1001", "customer_name": "Acme", "credit_balance": -1.0}

    assert _row_hash({**row, "region_id": "north"}) != _row_hash(
        {**row, "region_id": "south"}
    )


class _DeleteQuery:
    def __init__(self, query: dict[str, Any]) -> None:
        self.query = query

    async def delete(self) -> None:
        _FakeCreditReport.delete_queries.append(self.query)


class _FakeCreditReport:
    delete_queries: list[dict[str, Any]] = []
    inserted: list[Any] = []

    def __init__(self, **kwargs: Any) -> None:
        self.__dict__.update(kwargs)

    @classmethod
    def reset(cls) -> None:
        cls.delete_queries = []
        cls.inserted = []

    @classmethod
    def find(cls, query: dict[str, Any]) -> _DeleteQuery:
        return _DeleteQuery(query)

    @classmethod
    async def insert_many(cls, docs: list[Any]) -> None:
        cls.inserted.extend(docs)


async def _noop_cleanup(_model: object, _report_date: str) -> int:
    return 0


async def _noop_audit(*_args: object, **_kwargs: object) -> None:
    return None


def _patch_ingest(monkeypatch: Any) -> None:
    monkeypatch.setattr(ingest, "CreditReport", _FakeCreditReport)
    monkeypatch.setattr(
        ingest,
        "parse_workbook",
        lambda _raw: [
            {
                "customer": "1001",
                "customer_name": "Acme",
                "credit_control_area": "JV0H",
            }
        ],
    )
    monkeypatch.setattr(ingest, "cleanup_duplicates", _noop_cleanup)
    monkeypatch.setattr(ingest, "audit_credit_report_event", _noop_audit)


def test_ingest_region_uses_region_scoped_delete(tmp_path: Any, monkeypatch: Any) -> None:
    _FakeCreditReport.reset()
    _patch_ingest(monkeypatch)
    workbook = tmp_path / "credit report.XLSX"
    workbook.write_bytes(b"fake")

    inserted = asyncio.run(
        ingest.ingest_region(str(workbook), "24-06-2026", region_id="north")
    )

    assert inserted == 1
    assert _FakeCreditReport.delete_queries == [
        {"region_id": None, "report_date": "24-06-2026"},
        {"report_date": "24-06-2026", "region_id": "north"},
    ]
    assert _FakeCreditReport.inserted[0].region_id == "north"


def test_ingest_file_keeps_flat_delete_behavior(tmp_path: Any, monkeypatch: Any) -> None:
    _FakeCreditReport.reset()
    _patch_ingest(monkeypatch)
    workbook = tmp_path / "credit report.XLSX"
    workbook.write_bytes(b"fake")

    inserted = asyncio.run(ingest.ingest_file(str(workbook), "24-06-2026"))

    assert inserted == 1
    assert _FakeCreditReport.delete_queries == [{"report_date": "24-06-2026"}]
    assert _FakeCreditReport.inserted[0].region_id is None
