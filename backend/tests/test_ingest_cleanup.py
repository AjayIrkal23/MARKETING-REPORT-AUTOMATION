"""Unit tests for the shared ingest duplicate-cleanup helper."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any

from app.services.shared.ingest_cleanup import _row_hash, cleanup_duplicates


def test_row_hash_is_stable_for_identical_dicts() -> None:
    row = {"party_code": "004012", "route": "KAT036", "stock_quantity": 12.5}
    assert _row_hash(row) == _row_hash(dict(row))


def test_row_hash_differs_for_different_values() -> None:
    a = {"party_code": "004012", "route": "KAT036"}
    b = {"party_code": "004012", "route": "RTP012"}
    assert _row_hash(a) != _row_hash(b)


def test_row_hash_excludes_keys() -> None:
    base = {"party_code": "004012", "route": "KAT036"}
    with_meta = {
        **base,
        "report_date": "20-06-2026",
        "created_at": datetime.now(timezone.utc),
        "_id": "abc",
    }
    assert _row_hash(base) == _row_hash(
        with_meta, exclude={"report_date", "created_at", "_id"}
    )


def test_row_hash_ignores_none_values() -> None:
    a = {"party_code": "004012", "route": "KAT036"}
    b = {"party_code": "004012", "route": "KAT036", "ship_to_party": None}
    assert _row_hash(a) == _row_hash(b)


class _FakeDoc:
    """Minimal stand-in for a Beanie Document in cleanup tests."""

    def __init__(self, id: int, created_at: datetime, row_hash: str | None, **fields: Any):
        self.id = id
        self.created_at = created_at
        self.row_hash = row_hash
        self._fields = fields

    def model_dump(self) -> dict[str, Any]:
        return {"id": self.id, "row_hash": self.row_hash, **self._fields}


class _FakeQuery:
    def __init__(self, docs: list[_FakeDoc]):
        self._docs = docs

    async def to_list(self) -> list[_FakeDoc]:
        return list(self._docs)

    async def delete(self) -> None:
        self._docs.clear()


class _FakeModel:
    _store: list[_FakeDoc] = []
    _deleted_ids: list[Any] = []

    @classmethod
    def reset(cls, docs: list[_FakeDoc]) -> None:
        cls._store = docs
        cls._deleted_ids = []

    @classmethod
    def find(cls, query: dict[str, Any]) -> _FakeQuery:
        if "_id" in query and "$in" in query["_id"]:
            target_ids = set(query["_id"]["$in"])
            to_delete = [d for d in cls._store if d.id in target_ids]
            cls._deleted_ids.extend(d.id for d in to_delete)
            return _FakeQuery(to_delete)
        if "report_date" in query:
            return _FakeQuery([d for d in cls._store if d._fields.get("report_date") == query["report_date"]])
        return _FakeQuery(cls._store)


def test_cleanup_keeps_newest_duplicate_per_hash() -> None:
    same_hash = "abc123"
    docs = [
        _FakeDoc(1, datetime(2026, 6, 20, 8, 0, 0, tzinfo=timezone.utc), same_hash, report_date="20-06-2026", party_code="004012"),
        _FakeDoc(2, datetime(2026, 6, 20, 9, 0, 0, tzinfo=timezone.utc), same_hash, report_date="20-06-2026", party_code="004012"),
        _FakeDoc(3, datetime(2026, 6, 20, 10, 0, 0, tzinfo=timezone.utc), same_hash, report_date="20-06-2026", party_code="004012"),
    ]
    _FakeModel.reset(docs)

    deleted = asyncio.run(cleanup_duplicates(_FakeModel, "20-06-2026"))

    assert deleted == 2
    assert sorted(_FakeModel._deleted_ids) == [1, 2]


def test_cleanup_keeps_distinct_hashes_unchanged() -> None:
    docs = [
        _FakeDoc(1, datetime(2026, 6, 20, 8, 0, 0, tzinfo=timezone.utc), "h1", report_date="20-06-2026", party_code="111"),
        _FakeDoc(2, datetime(2026, 6, 20, 8, 0, 0, tzinfo=timezone.utc), "h2", report_date="20-06-2026", party_code="222"),
    ]
    _FakeModel.reset(docs)

    deleted = asyncio.run(cleanup_duplicates(_FakeModel, "20-06-2026"))

    assert deleted == 0
    assert _FakeModel._deleted_ids == []


def test_cleanup_computes_hash_when_missing() -> None:
    docs = [
        _FakeDoc(1, datetime(2026, 6, 20, 8, 0, 0, tzinfo=timezone.utc), None, report_date="20-06-2026", party_code="004012"),
        _FakeDoc(2, datetime(2026, 6, 20, 9, 0, 0, tzinfo=timezone.utc), None, report_date="20-06-2026", party_code="004012"),
    ]
    _FakeModel.reset(docs)

    deleted = asyncio.run(cleanup_duplicates(_FakeModel, "20-06-2026"))

    assert deleted == 1
    assert _FakeModel._deleted_ids == [1]


def test_cleanup_limits_to_requested_report_date() -> None:
    same_hash = "shared"
    docs = [
        _FakeDoc(1, datetime(2026, 6, 20, 8, 0, 0, tzinfo=timezone.utc), same_hash, report_date="20-06-2026", party_code="004012"),
        _FakeDoc(2, datetime(2026, 6, 21, 9, 0, 0, tzinfo=timezone.utc), same_hash, report_date="21-06-2026", party_code="004012"),
    ]
    _FakeModel.reset(docs)

    deleted = asyncio.run(cleanup_duplicates(_FakeModel, "20-06-2026"))

    assert deleted == 0
